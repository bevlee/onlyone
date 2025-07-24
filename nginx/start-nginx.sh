#!/bin/sh

echo "🎮 Starting OnlyOne Party Game..."
echo "Environment: ${ENVIRONMENT:-dev}"
echo "Server: ${GAMESERVER_HOST:-gameserver}:${GAMESERVER_PORT:-3001}"

# Set defaults for environment variables
export ENVIRONMENT=${ENVIRONMENT:-dev}
export SERVER_NAME=${SERVER_NAME:-localhost}
export GAMESERVER_HOST=${GAMESERVER_HOST:-gameserver}
export GAMESERVER_PORT=${GAMESERVER_PORT:-3001}
export STATIC_ROOT=${STATIC_ROOT:-/usr/share/nginx/html}
export STATIC_CACHE_DURATION=${STATIC_CACHE_DURATION:-1h}

# Substitute environment variables
envsubst '
$ENVIRONMENT
$SERVER_NAME
$GAMESERVER_HOST
$GAMESERVER_PORT
$STATIC_ROOT
$STATIC_CACHE_DURATION
' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "✅ Configuration ready"

# Test nginx config and start in foreground
nginx -t && nginx -g "daemon off;"