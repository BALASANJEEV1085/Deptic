# Stage 1: Build Next.js frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm install --legacy-peer-deps
COPY apps/web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Build Go API backend
# Use the EXACT Go version required by go.mod (1.26.2)
FROM golang:1.26.2-alpine AS api-builder
RUN apk add --no-cache git
WORKDIR /app/api
ENV GOFLAGS=-mod=mod
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Stage 3: Minimal production runtime
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=api-builder /app/api/server ./server
EXPOSE 8081
ENV PORT=8081
CMD ["./server"]
