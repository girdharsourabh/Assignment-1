#!/bin/sh

# Render sets $PORT for the public-facing port (e.g. 10000).
# nginx listens on that port and proxies /api/* to Node on 3001.
# Node must NOT read $PORT — it always runs on 3001 internally.
APP_PORT=${PORT:-80}

# Inject the public port into nginx config
sed -i "s/PORT_PLACEHOLDER/$APP_PORT/" /etc/nginx/nginx.conf

# Start nginx in background
nginx

# Start Node on fixed internal port 3001 — unset $PORT so index.js
# cannot accidentally bind to Render's public port
unset PORT
exec node /app/backend/src/index.js