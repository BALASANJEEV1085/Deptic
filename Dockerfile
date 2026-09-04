# =============================================================================================================
# Combined API + Web Runtime Dockerfile
# =============================================================================================================

# Stage 1 – Build Go API
FROM golang:1.26-alpine AS api-builder
WORKDIR /build/api

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Download Go modules
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

# Copy source and build static binary
COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-w -s" -o /build/api/server ./cmd/server

# Stage 2 – Build Next.js frontend
FROM node:20-alpine AS web-builder
WORKDIR /build/web

RUN apk add --no-cache libc6-compat

# Install Node dependencies
COPY apps/web/package*.json ./
RUN npm ci || npm install

# Copy source and build production assets
COPY apps/web/ ./
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Prune devDependencies to keep the image lean
RUN npm prune --production

# Stage 3 – Runtime image
FROM node:20-alpine AS runner
WORKDIR /app

# Base runtime dependencies
RUN apk add --no-cache ca-certificates tzdata bash

# Copy the Go binary
COPY --from=api-builder /build/api/server /app/api/server

# Copy the Next.js build artifacts
COPY --from=web-builder /build/web/.next /app/web/.next
COPY --from=web-builder /build/web/public /app/web/public
COPY --from=web-builder /build/web/package*.json /app/web/
COPY --from=web-builder /build/web/node_modules /app/web/node_modules
COPY --from=web-builder /build/web/next.config.mjs /app/web/

# Create non‑root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Expose ports
EXPOSE 8081 3000

# Health check – simple probe that pings the web UI
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -fs http://localhost:3000/ || exit 1
