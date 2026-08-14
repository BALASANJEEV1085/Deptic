# Stage 1: Build Next.js frontend with standalone output
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ ./
# Enable standalone output so it can run without next start
RUN sed -i "s/const nextConfig = {/const nextConfig = { output: 'standalone',/" next.config.mjs || true
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Build Go API backend (exact version from go.mod: 1.26.2)
FROM golang:1.26.2-alpine AS api-builder
RUN apk add --no-cache git
WORKDIR /app/api
ENV GOFLAGS=-mod=mod
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Stage 3: nginx serving frontend on port 80, proxying /api to Go on port 8081
FROM nginx:1.27-alpine
RUN apk add --no-cache ca-certificates tzdata nodejs

WORKDIR /app

# Go API binary
COPY --from=api-builder /app/api/server ./server

# Next.js standalone output (self-contained Node.js server)
COPY --from=web-builder /app/web/.next/standalone ./web/
COPY --from=web-builder /app/web/.next/static ./web/.next/static/
COPY --from=web-builder /app/web/public ./web/public/ 2>/dev/null || true

# nginx config: frontend on / and API on /api/*
RUN printf 'server {
    listen 80;
    
    # Proxy all /api/* requests to Go backend
    location /api/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
    
    # Serve Next.js app on /
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8081/health;
    }
}
' > /etc/nginx/conf.d/default.conf

EXPOSE 80
ENV PORT=8081
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Start: Go API on 8081, Next.js standalone on 3000, nginx on 80
CMD sh -c './server & node web/server.js & nginx -g "daemon off;"'
