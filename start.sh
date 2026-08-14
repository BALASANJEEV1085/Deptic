#!/bin/sh
set -e

echo "=== Starting Deptic Container ==="

# 1. Start Go backend in background
echo "Starting Go API backend on port 8081..."
./server &
GO_PID=$!

# 2. Find and start Next.js standalone server
SERVER_JS=$(find /app/web -name "server.js" | head -n 1)
if [ -n "$SERVER_JS" ]; then
    echo "Found Next.js standalone server at: $SERVER_JS"
    SERVER_DIR=$(dirname "$SERVER_JS")
    echo "Starting Next.js in directory: $SERVER_DIR on port 3000..."
    (cd "$SERVER_DIR" && PORT=3000 HOSTNAME=0.0.0.0 node "$(basename "$SERVER_JS")") &
    NEXT_PID=$!
else
    echo "WARNING: No server.js found under /app/web! Listing /app/web:"
    ls -la /app/web
fi

# 3. Start nginx in foreground
echo "Starting nginx on port 80..."
exec nginx -g "daemon off;"
