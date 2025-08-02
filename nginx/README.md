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
# Access: http://localhost:8080
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
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `ENVIRONMENT` | `development` | `production` | Environment identifier |
| `SERVER_NAME` | `localhost` | `yourdomain.com` | Primary server name |
| `GAMESERVER_HOST` | `gameserver` | `gameserver` | Backend container name |
| `GAMESERVER_PORT` | `3000` | `3000` | Backend port |

### Rate Limiting
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `RATE_LIMIT_API` | `100` | `10` | API requests per second |
| `RATE_LIMIT_STATIC` | `200` | `50` | Static files per second |
| `RATE_LIMIT_APP` | `100` | `20` | App routes per second |
| `BURST_LIMIT` | `100` | `30` | Additional burst requests |

### Security Headers
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `XSS_PROTECTION` | `0; mode=block` | `1; mode=block` | XSS protection level |
| `CSP_POLICY` | `default-src 'self' 'unsafe-inline'` | `default-src 'self' http: https:` | Content Security Policy |

### Caching
| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `STATIC_CACHE_DURATION` | `1h` | `1y` | Static asset cache time |
| `CACHE_IMMUTABLE` | `""` | `", immutable"` | Immutable cache directive |

## 🔧 Configuration Files

### nginx.conf
Main configuration template with environment variable placeholders:
```nginx
server_name ${SERVER_NAME:-localhost};
limit_req zone=api burst=${API_BURST:-20} nodelay;
expires ${STATIC_CACHE_DURATION:-1h};
```

### start-nginx.sh
Startup script that:
1. Substitutes environment variables in the config template
2. Validates the generated configuration
3. Starts nginx with the processed config

### docker-compose.yml / docker-compose.dev.yml
Docker Compose files that set environment variables appropriate for each environment.

## 🌐 Server Blocks

The nginx configuration includes multiple server blocks:

### 1. Main Application Server
- **Server Name**: `${SERVER_NAME}` (localhost/yourdomain.com)
- **Purpose**: Serves the OnlyOne application
- **Features**: Rate limiting, caching, security headers, WebSocket support

### 2. Production Multi-App Server (bevsoft.com)
- **Server Name**: `bevsoft.com` (hardcoded for production)
- **Purpose**: Supports your existing multi-application setup
- **Applications**: OnlyOne (`/onlyone`), Trivia (`/trivia`), Birthday (`/birthday`)

### 3. HTTPS Redirect Server
- **Port**: 443 (SSL)
- **Purpose**: Redirects HTTPS to HTTP (production only)
- **SSL**: Let's Encrypt certificates

### 4. Static File Servers
- **Ports**: 8080, 8081, 9000
- **Purpose**: Serve static files for different applications

## 🔄 Environment Switching

### Method 1: Environment Variables
Set variables in your shell:
```bash
export ENVIRONMENT=production
export SERVER_NAME=yourdomain.com
export RATE_LIMIT_API=5
./scripts/prod.sh
```

### Method 2: .env File
Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
# Edit .env with your settings
docker-compose up --build
```

### Method 3: Docker Compose Override
Create environment-specific overrides:
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production with custom domain
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## 🐛 Troubleshooting

### Check Configuration
```bash
# Test nginx config
docker-compose exec nginx nginx -t

# View processed config
docker-compose exec nginx cat /etc/nginx/nginx.conf

# View environment variables
docker-compose exec nginx env | grep -E "(ENVIRONMENT|SERVER_NAME|RATE_LIMIT)"
```

### Common Issues

**Environment variables not substituted**:
- Check that variables are defined in docker-compose.yml
- Verify start-nginx.sh has execute permissions
- Ensure variable names match in template and startup script

**Rate limiting too strict**:
- Increase `RATE_LIMIT_*` values for development
- Check burst limits are appropriate for your traffic

**Caching issues**:
- Use shorter cache durations in development
- Clear browser cache when testing

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

## 🔒 Security Considerations

- **Rate Limiting**: Protects against abuse and DDoS
- **Security Headers**: Prevents XSS, clickjacking, and MIME sniffing
- **Content Security Policy**: Controls script execution and resource loading
- **HTTPS**: Redirects for secure communication (production)
- **Error Pages**: Custom error pages prevent information disclosure