#!/usr/bin/env sh
#
# Entry‑point for the combined API + Web runtime image.
# It starts the Go API server in the background followed by the
# Next.js production server so that both services are available
# on their respective exposed ports.
#
# The script traps SIGTERM and SIGINT to gracefully shutdown
# the child processes when the container is stopped.

set -e

# Start the Go API server
/app/api/server &
API_PID=$!

# Change to the web directory and start the Next.js production server
# `npm run start` is expected to invoke `next start` as defined in the
# web package.json. If the script is not defined, the user can replace
# this line with the appropriate start command.
(cd /app/web && npm run start) &
WEB_PID=$!

# Function to forward termination signals to child processes
term_handler() {
  echo "Received shutdown signal, terminating services..."
  kill -TERM "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
  exit 0
}

# Trap SIGTERM and SIGINT
trap term_handler SIGTERM SIGINT

# Wait for any child process to exit
wait -n

# When any child exits, exit the script with that status
EXIT_CODE=$?
exit $EXIT_CODE
