# OnlyOne Game

A cooperative multiplayer word guessing game inspired by [Just One](<https://en.wikipedia.org/wiki/Just_One_(board_game)>) with a few tweaks.

Built with Svelte frontend, Node.js backend, and containerized deployment.

## Demo

You can test the game at https://onlyone.bevsoft.com

Note: This is a multiplayer game - you'll need multiple players to enjoy the full experience!

## Architecture

- **Frontend**: Svelte application with Socket.IO client and SSR
- **Backend**: Node.js gameserver with modular architecture
- **Authentication**: Server-side Supabase auth with httpOnly cookies
- **Proxy**: Nginx reverse proxy for routing and static files
- **Deployment**: Docker Compose orchestration

### Gameserver Architecture

The gameserver has a modular architecture:

- **ConnectionManager**: Handles player connections and room management
- **GameStateManager**: Centralized game state and progress tracking
- **GameLoop**: Main game phases (difficulty, clue, voting, guessing)
- **Handlers**: Socket event handlers for game actions and chat
- **Utils**: Shared utilities and word operations
- **Authentication Middleware**: Server-side auth with automatic token refresh

### Authentication

Authentication is handled entirely server-side using Supabase:

- **HttpOnly Cookies**: Access and refresh tokens stored securely
- **No Client-Side Checks**: Frontend never touches auth tokens
- **Automatic Refresh**: Gameserver middleware handles token refresh transparently
- **SSR Integration**: SvelteKit hooks fetch user session from gameserver
- **Session Persistence**: Refresh tokens valid for 7 days

**Authentication Flow:**
1. User authenticates via gameserver endpoints (email/password, OAuth, or anonymous)
2. Gameserver sets httpOnly cookies (`sb-access-token`, `sb-refresh-token`)
3. Frontend SSR hook calls gameserver `/auth/me` on each page load
4. Gameserver middleware validates tokens and auto-refreshes if needed
5. User data attached to SvelteKit `event.locals` for server-side use

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

## Future Goals

### User-Submitted Words Game Mode

A planned enhancement to add player-generated content and increased replayability:

**Core Concept:**
- Players submit words during lobby/setup phase
- System ensures fair distribution (players never get their own submitted words)
- Mix of user-submitted and curated words for variety and safety

**Features:**
- **Word Submission UI**: Lobby interface for players to contribute 3-5 words per game
- **Fair Distribution**: Algorithm prevents players from guessing their own submissions
- **Quality Tracking**: Database storage for word performance analytics
- **User Stats**: Track submission success rates ("Your words were guessed correctly 73% of the time!")
- **Moderation System**: Filter inappropriate content before gameplay
- **Word Analytics**: Identify which user words work best for different difficulty levels

**Database Design:**
```sql
user_submitted_words (
  submitter_id, word, difficulty, times_used,
  times_guessed_correctly, quality_rating
)
```

**Benefits:**
- Infinite content variety from player creativity
- Personal investment in submitted words
- Enhanced social gameplay ("Who submitted 'serendipity'?")
- Rich analytics for word quality and user engagement
- Self-sustaining content ecosystem

This feature would transform the game from using a fixed word pool to a dynamic, community-driven word generation system.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[Add your license here]
