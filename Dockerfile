# ===================================================================
# Stage 1: Build the Go API Backend
# ===================================================================
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

# ===================================================================
# Stage 2: Build the Next.js Web Frontend
# ===================================================================
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

# ===================================================================
# Stage 3: Combined Production Runtime
# ===================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install CA certificates and tzdata for the runtime containers
RUN apk add --no-cache ca-certificates tzdata bash

# Copy the Go binary from the builder stage
COPY --from=api-builder /build/api/server /app/api/server

# Copy the Next.js build output and runtime files
COPY --from=web-builder /build/web/.next /app/web/.next
COPY --from=web-builder /build/web/public /app/web/public
COPY --from=web-builder /build/web/package*.json /app/web/
COPY --from=web-builder /build/web/node_modules /app/web/node_modules
COPY --from=web-builder /build/web/next.config.mjs /app/web/

# Create a non‑root user to run the services
RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

# -------------------------------------------------------------------
# Entrypoint – launch both services in the same container
# -------------------------------------------------------------------
RUN printf '#!/bin/bash\n\n'\
     'set -e\n\n'\
     'echo "[DEPTIC] Starting Go API Backend on port 8081…"\n'\
     'cd /app/api && ./server &\n'\
     'API_PID=$!\n\n'\
     'echo "[DEPTIC] Starting Next.js Web Frontend on port 3000…"\n'\
     'cd /app/web && npx next start -p 3000 -H\n' > /usr/local/bin/entrypoint.sh && \n'
    chmod +x /usr/local/bin/entrypoint.sh && \n'
    chown appuser:appgroup /usr/local/bin/entrypoint.sh

# Run as the non‑root user
USER appuser

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Expose the application ports
EXPOSE 8081 3000
