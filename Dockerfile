FROM nginx:1.27-alpine AS base
RUN apk add --no-cache ca-certificates tzdata nodejs

WORKDIR /app

# Go API binary
FROM golang:1.26 AS api-builder
WORKDIR /app
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api .
RUN go build -o server ./cmd/server

# Next.js standalone output
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web .
RUN npm run build

# Copy from api-builder and web-builder
COPY --from=api-builder /app/server ./server
# Removed the problematic COPY command
# COPY --from=web-builder /app/.next/standalone ./web/

# nginx reverse proxy config
RUN cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    location /api/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /health {
        proxy_pass http://127.0.0.1:8081;
    }
}
EOF