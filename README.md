# OnlyOne Game

A cooperative multiplayer word guessing game inspired by [Just One](<https://en.wikipedia.org/wiki/Just_One_(board_game)>).

Built with Svelte frontend, Node.js backend, and Docker deployment.

## Demo

You can test the game at https://bevsoft.com/onlyone

Note: This is a multiplayer game - you'll need multiple players to enjoy the full experience!

## Architecture

- **Frontend**: Svelte application with Socket.IO client
- **Backend**: Node.js gameserver with modular architecture
- **Proxy**: Nginx reverse proxy for routing and static files
- **Deployment**: Docker Compose orchestration

### Gameserver Architecture

The gameserver has a modular architecture:

- **ConnectionManager**: Handles player connections and room management
- **GameStateManager**: Centralized game state and progress tracking
- **GameLoop**: Main game phases (category, clue, voting, guessing)
- **Handlers**: Socket event handlers for game actions and chat
- **Utils**: Shared utilities and word operations

## Quick Start

### Development

```bash
# Frontend development server
cd front && npm run dev      # https://localhost:5173

# Backend development server
cd gameserver && npm start   # http://localhost:3001
```

### Production with Docker

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Services

### Frontend (Port 80/443 via Nginx)

- Svelte SPA with real-time Socket.IO communication
- Static file serving with aggressive caching
- SPA routing with fallback to index.html

### Gameserver (Internal Port 3001)

- Socket.IO server for real-time game events
- Game state management across multiple rooms
- Player connection and name change handling
- Comprehensive test coverage

### Nginx Reverse Proxy (Port 80/443)

- Routes `/socket.io/*` → gameserver WebSocket
- Routes `/*` → frontend static files
- Security headers and rate limiting
- Health monitoring and error handling

## Docker Services

- **frontend-builder**: Builds Svelte application assets
- **gameserver**: Node.js backend with game logic
- **nginx**: Reverse proxy and static file server

## URLs

- **Application**: https://localhost
- **WebSocket**: https://localhost/socket.io/\*
- **Health Check**: https://localhost/health

## Development

### Frontend Development

```bash
cd front
npm install
npm run dev
npm run test
```

### Backend Development

```bash
cd gameserver
npm install
npm test
npm start
```

### Testing

```bash
# Frontend tests
cd front && npm test

# Backend tests
cd gameserver && npm test

# All tests
npm run test:all
```

## Production Deployment

1. **Build and deploy**:

   ```bash
   docker-compose up --build -d
   ```

2. **Monitor services**:

   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

3. **Health checks**:
   ```bash
   curl https://localhost/health
   ```

## Configuration

### SSL Certificates

Place your SSL certificates in the `certs/` directory:

```
certs/
├── server.pem      # SSL certificate
└── server-key.pem  # Private key
```

### Development SSL Setup

For local development, create SSL certificates using [mkcert](https://github.com/FiloSottile/mkcert):

```bash
# Install mkcert (macOS)
brew install mkcert

# Install mkcert (Linux)
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install the local CA
mkcert -install

# Create certificates for localhost
mkdir -p certs
mkcert -key-file certs/server-key.pem -cert-file certs/server.pem localhost 127.0.0.1 ::1
```

This creates trusted SSL certificates for localhost development that work with all browsers.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
ENVIRONMENT=production
NODE_ENV=production
GAMESERVER_PORT=3001
GAMESERVER_HOST=gameserver
SERVER_NAME=your-domain.com
```

### Docker Compose Override

For production customization, create `docker-compose.override.yml`:

```yaml
version: "3.8"
services:
  nginx:
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
```

## Features

### Game Mechanics

- Real-time multiplayer word guessing
- Select a category to guess a secret word from
- Collaborative clue writing with duplicate elimination
- Vote on whether clues are duplicates
- See how many you can guess right as a team

### Technical Features

- WebSocket-based real-time communication
- Room-based game isolation
- Automatic duplicate clue detection

### Security & Performance

- Static asset caching with immutable headers
- No direct backend exposure (proxied through Nginx)

## Monitoring

- **Nginx logs**: `docker-compose logs nginx`
- **Gameserver logs**: `docker-compose logs gameserver`
- **Health status**: `curl https://localhost/health`
- **Service status**: `docker-compose ps`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[Add your license here]
