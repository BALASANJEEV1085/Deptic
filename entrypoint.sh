#!/usr/bin/env bash
# Entrypoint script to run the Go API and the Next.js front‑end in parallel.
# This script keeps the container running as long as either process is alive.

set -e

# Start the Go API in the background
/app/api/server &
API_PID=$!

# Start Next.js in the foreground
cd /app/web
npm start &
WEB_PID=$!

# Wait for any of the processes to exit
wait -n
EXIT_STATUS=$?

# Kill the other process if it is still running
kill $API_PID 2>/dev/null || true
kill $WEB_PID 2>/dev/null || true

exit $EXIT_STATUS
