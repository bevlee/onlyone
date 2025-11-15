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

/front

```bash
npm run dev
```

/gameserver

```bash
node index.js
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
GAMESERVER_PORT=3000
SERVER_NAME=your-domain.com
```

## Features

### Game Mechanics

- Real-time multiplayer word guessing
- Select a difficulty level to guess a secret word from
- Collaborative clue writing with duplicate elimination
- Vote on whether clues are duplicates
- See how many you can guess right as a team
