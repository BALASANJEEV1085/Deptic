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
COPY --from=web-builder /app/.next/standalone ./web/
# Removed the problematic COPY command
# COPY --from=web-builder /app/.next/static ./web/apps/web/.next/static/

# nginx reverse proxy config
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && 
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && 
    echo '    location /api/ {' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_pass http://127.0.0.1:8081;' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && 
    echo '    }' >> /etc/nginx/conf.d/default.conf && 
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_pass http://127.0.0.1:8081;' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && 
    echo '    }' >> /etc/nginx/conf.d/default.conf && 
    echo '    location /health {' >> /etc/nginx/conf.d/default.conf && 
    echo '        proxy_pass http://127.0.0.1:8081;' >> /etc/nginx/conf.d/default.conf && 
    echo '    }' >> /etc/nginx/conf.d/default.conf && 
    echo '}' >> /etc/nginx/conf.d/default.conf