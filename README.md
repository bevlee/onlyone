# OnlyOne Game

A cooperative multiplayer word guessing game inspired by [Just One](<https://en.wikipedia.org/wiki/Just_One_(board_game)>) with a few tweaks.

Built with Svelte frontend, Node.js backend, and containerized deployment.

## Demo

You can test the game at https://onlyone.bevsoft.com

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
- **GameLoop**: Main game phases (difficulty, clue, voting, guessing)
- **Handlers**: Socket event handlers for game actions and chat
- **Utils**: Shared utilities and word operations

## Services

### Frontend (Port 80 via Nginx)

- Svelte SPA with real-time Socket.IO communication
- Static file serving with aggressive caching
- SPA routing with fallback to index.html

### Gameserver (Internal Port 3000)

- Socket.IO server for real-time game events
- Game state management across multiple rooms
- Player connection and name change handling
- Comprehensive test coverage

### Nginx Reverse Proxy (Port 80)

- Routes `/socket.io/*` → gameserver WebSocket
- Routes `/*` → frontend static files
- Security headers and rate limiting
- Health monitoring and error handling

## Docker Services

- **frontend-builder**: Builds Svelte application assets
- **gameserver**: Node.js backend with game logic
- **nginx**: Reverse proxy and static file server

## URLs

- **Application**: http://localhost
- **WebSocket**: http://localhost/socket.io/\*
- **Health Check**: http://localhost/health

## Deployment

### Local

```bash
npm run dev
```

### Docker Compose

1. **Build and deploy**:

   ```bash
   docker-compose up --build -d
   ```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
ENVIRONMENT=production
NODE_ENV=production
GAMESERVER_PORT=3000
GAMESERVER_HOST=gameserver
SERVER_NAME=your-domain.com
```

## Features

### Game Mechanics

- Real-time multiplayer word guessing
- Select a difficulty level to guess a secret word from
- Collaborative clue writing with duplicate elimination
- Vote on whether clues are duplicates
- See how many you can guess right as a team

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[Add your license here]
