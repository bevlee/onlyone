#!/bin/sh

echo "🎮 Starting OnlyOne Party Game..."
echo "Environment: ${ENVIRONMENT:-dev}"
echo "Server: gameserver:${GAMESERVER_PORT:-3000}"

# Set defaults for environment variables
export ENVIRONMENT=${ENVIRONMENT:-dev}
export SERVER_NAME=${SERVER_NAME:-localhost}
export GAMESERVER_PORT=${GAMESERVER_PORT:-3000}
export STATIC_ROOT=${STATIC_ROOT:-/usr/share/nginx/html}

# Substitute environment variables
envsubst '
$ENVIRONMENT
$SERVER_NAME
$
$GAMESERVER_PORT
$STATIC_ROOT
' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "✅ Configuration ready"

# Test nginx config and start in foreground
nginx -t && nginx -g "daemon off;"