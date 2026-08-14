# Stage 1: Build Next.js frontend with standalone output
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ ./
RUN sed -i "s/const nextConfig = {/const nextConfig = { output: 'standalone',/" next.config.mjs || true
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Build Go API backend
FROM golang:1.26.2-alpine AS api-builder
RUN apk add --no-cache git
WORKDIR /app/api
ENV GOFLAGS=-mod=mod
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Stage 3: Final image running both API and Next.js behind nginx
FROM nginx:1.27-alpine
RUN apk add --no-cache ca-certificates tzdata nodejs

WORKDIR /app

# Go API binary
COPY --from=api-builder /app/api/server ./server

# Next.js standalone output
COPY --from=web-builder /app/web/.next/standalone ./web/
COPY --from=web-builder /app/web/.next/static ./web/.next/static/
COPY --from=web-builder /app/web/public ./web/public/ 2>/dev/null || true

# nginx reverse proxy config
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location /api/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_pass http://127.0.0.1:8081;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_pass http://127.0.0.1:3000;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    location /health {' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_pass http://127.0.0.1:8081/health;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 80
ENV PORT=8081
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

CMD sh -c './server & node web/server.js & nginx -g "daemon off;"'
