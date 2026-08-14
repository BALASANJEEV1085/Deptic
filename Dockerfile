# Stage 1: Build Next.js frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Build Go API backend
FROM golang:1.23-alpine AS api-builder
WORKDIR /app/api
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Stage 3: Production runtime
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=api-builder /app/api/server ./server
EXPOSE 8081
ENV PORT=8081
CMD ["./server"]
