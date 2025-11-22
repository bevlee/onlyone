# OnlyOne Nginx Configuration

This directory contains the nginx configuration for OnlyOne using environment-based configuration for different deployment scenarios.

## 🏗️ Architecture

- **Single Config File**: `nginx.conf` serves as a template with environment variable placeholders
- **Environment-Based**: Different settings for development, production, and your current bevsoft.com setup
- **Docker Integration**: Uses `envsubst` to substitute variables at container startup

## 🚀 Quick Start

### Development

```bash
./scripts/dev.sh
# Access: http://localhost:80
```

### Production (Docker)

```bash
./scripts/prod.sh
# Access: http://localhost
```

### Current Production (bevsoft.com)

Use your existing `server.conf` or the enhanced version:

```bash
sudo cp nginx/server.enhanced.conf /etc/nginx/sites-available/onlyone
sudo nginx -t && sudo systemctl reload nginx
```

## 📋 Environment Variables

### Core Settings

| Variable          | Development   | Production       | Description            |
| ----------------- | ------------- | ---------------- | ---------------------- |
| `ENVIRONMENT`     | `development` | `production`     | Environment identifier |
| `SERVER_NAME`     | `localhost`   | `yourdomain.com` | Primary server name    |
| `GAMESERVER_PORT` | `3000`        | `3000`           | Backend port           |

## 🔧 Configuration Files

### nginx.conf

Main configuration template with environment variable placeholders:

```nginx
server_name ${SERVER_NAME:-localhost};
```

### start-nginx.sh

Startup script that:

1. Substitutes environment variables in the config template
2. Validates the generated configuration
3. Starts nginx with the processed config

### 1. Main Application Server

- **Server Name**: `${SERVER_NAME}` (localhost/yourdomain.com)
- **Purpose**: Serves the OnlyOne application
- **Features**: Security headers, WebSocket support

### 2. Production Multi-App Server (bevsoft.com)

- **Server Name**: `bevsoft.com` (hardcoded for production)
- **Purpose**: Supports the OnlyOne frontend
- **Applications**: OnlyOne (`/onlyone`)

## 🐛 Troubleshooting

### Check Configuration

```bash
# Test nginx config
docker-compose exec nginx nginx -t

# View processed config
docker-compose exec nginx cat /etc/nginx/nginx.conf

# View environment variables
docker-compose exec nginx env | grep -E "(ENVIRONMENT|SERVER_NAME)"
```

### Common Issues

**Environment variables not substituted**:

- Check that variables are defined in docker-compose.yml
- Verify start-nginx.sh has execute permissions
- Ensure variable names match in template and startup script

### Logs

```bash
# Nginx access logs
docker-compose logs nginx

# Nginx error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log

# Startup script output
docker-compose logs nginx | grep "🔧\|✅\|❌"
```

## 📈 Migration Path

1. **Current State**: Using `server.conf` with hardcoded values
2. **Enhanced**: Switch to `server.enhanced.conf` with performance improvements
3. **Containerized**: Migrate to Docker setup with environment variables
4. **Full Environment**: Use this environment-based configuration
