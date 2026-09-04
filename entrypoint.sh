#!/usr/bin/env bash
# Simple entrypoint that launches the Go API and the Next.js web server
set -e

# Start the Go API in background
printf "[DEPTIC] Starting Go API backend on port 8081…\n"
cd /app/api
./server &
API_PID=$!

# Start the Next.js web server in background
printf "[DEPTIC] Starting Next.js web frontend on port 3000…\n"
cd /app/web
# The Next.js production server can be started with `npm start` (uses package.json's "start" script)
npm start &
WEB_PID=$!

# Wait for both processes; exit if either fails
wait $API_PID
API_EXIT=$?
wait $WEB_PID
WEB_EXIT=$?

if [ $API_EXIT -ne 0 ] || [ $WEB_EXIT -ne 0 ]; then
  printf "[DEPTIC] One of the services failed (API=$API_EXIT WEB=$WEB_EXIT).\n"
  exit 1
fi

# If we reach here, both services terminated cleanly – exit with code 0
exit 0
