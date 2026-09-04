# ==============================================================================
# Stage 1: Build the Go API Backend
# ==============================================================================
FROM golang:alpine AS api-builder

WORKDIR /build/api

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

# Copy API source and build statically linked executable
COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /build/api/server ./cmd/server

# ==============================================================================
# Stage 2: Build the Next.js Web Frontend
# ==============================================================================
FROM node:20-alpine AS web-builder

WORKDIR /build/web

RUN apk add --no-cache libc6-compat

# Install frontend dependencies
COPY apps/web/package*.json ./
RUN npm ci || npm install

# Copy web source and create production build
COPY apps/web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Prune devDependencies to keep final bundle lean
RUN npm prune --production

# ==============================================================================
# Stage 3: Combined Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install CA certificates and bash for reliable process management
RUN apk add --no-cache ca-certificates tzdata bash

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy Go API binary
COPY --from=api-builder /build/api/server /app/api/server

# Copy Next.js Web app build and runtime files
COPY --from=web-builder /build/web/package*.json /app/web/
COPY --from=web-builder /build/web/node_modules /app/web/node_modules
COPY --from=web-builder /build/web/.next /app/web/.next
COPY --from=web-builder /build/web/public /app/web/public
COPY --from=web-builder /build/web/next.config.mjs /app/web/

# Create non-root system user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Entrypoint script to orchestrate both services
RUN printf '#!/bin/bash\n\
set -e\n\
\n\
echo "[Deptic] Starting Go API Backend on port 8081..."\n\
cd /app/api && ./server &\n\
API_PID=$!\n\
\n\
echo "[Deptic] Starting Next.js Web Frontend on port 3000..."\n\
cd /app/web && npx next start -p 3000 -H 0.0.0.0 &\n\
WEB_PID=$!\n\
\n\
# Forward termination signals cleanly\n\
trap "echo [Deptic] Shutting down...; kill -TERM $API_PID $WEB_PID 2>/dev/null; exit 0" SIGINT SIGTERM\n\
\n\
# Wait for any process to exit\n\
wait -n $API_PID $WEB_PID\n\
EXIT_CODE=$?\n\
kill -TERM $API_PID $WEB_PID 2>/dev/null || true\n\
exit $EXIT_CODE\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

USER appuser

# Expose Go API (8081) and Next.js Web UI (3000)
EXPOSE 8081 3000

ENTRYPOINT ["/app/entrypoint.sh"]
