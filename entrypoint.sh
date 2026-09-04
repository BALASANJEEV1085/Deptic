#!/usr/bin/env bash
# Exit on any error
set -e

# Start the API in the background
./api/server &
API_PID=$!

# Start the web application (Next.js) – the build artifacts already exist in /app/web
# Use the locally installed "next" binary.
cd /app/web
npm ci > /dev/null 2>&1 || npm install
npm run start -p 3000 &
WEB_PID=$!

# Wait for both processes to finish (they won't under normal operation)
wait $API_PID
wait $WEB_PID

# If either process exits, exit with the same status
exit $?
