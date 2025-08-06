# OnlyOne Project - Architecture Overview

## System Overview

OnlyOne is a real-time multiplayer word-guessing game inspired by the "Just One" board game. Players take turns as a guesser while others write clues, vote to filter duplicates, and the guesser attempts to guess the secret word.

## Three-Tier Architecture

### Frontend (`/front/`)
**Technology**: SvelteKit 2.x + Svelte 5 + TypeScript + TailwindCSS
- **Purpose**: Interactive web UI for game participation
- **Build Output**: Static files (HTML, CSS, JS) served by nginx
- **Real-time**: Socket.IO client connects to gameserver via nginx proxy
- **Key Components**: 
  - `Room.svelte`: Main game orchestrator
  - Game phase components: `ChooseCategory`, `WriteClues`, `FilterClues`, `GuessWord`, `EndGame`
- **Testing**: Vitest (unit) + Playwright (E2E)

### Nginx (`/nginx/`)
**Technology**: Nginx Alpine with custom configuration
- **Static File Serving**: Serves frontend build files from `/usr/share/nginx/html`
- **Reverse Proxy**: Routes `/socket.io/*` requests to gameserver with WebSocket upgrade
- **Performance**: Gzip compression, static asset caching
- **Configuration**: Environment-based templating with `envsubst`

### Gameserver (`/gameserver/`)
**Technology**: Node.js 20 + Express + Socket.IO
- **Purpose**: Game logic, state management, real-time communication
- **Architecture**: Modular design with clear separation of concerns
- **Key Modules**:
  - `ConnectionManager`: Player connections and room management
  - `GameStateManager`: Thread-safe state with PQueue concurrency control
  - `GameLoop`: Game phase orchestration and turn management
  - `chatHandlers`: Socket event handlers for player actions
- **Security**: Non-root user execution, input validation
- **Logging**: Pino logger with rotating file streams

## Docker Integration

### Service Dependencies
```
Frontend (build) → Nginx (static files + proxy) → Gameserver (API + WebSocket)
```

### Network Architecture
1. **External Access**: Client → AWS ALB → ECS (port 80)
2. **Internal Proxy**: Nginx → Gameserver (internal Docker network)
3. **WebSocket Upgrade**: Seamless HTTP → WebSocket transition for Socket.IO

### Container Security
- **Non-root execution**: Gameserver runs as user `1001:1001`
- **Multi-stage builds**: Optimized production images

## Real-time Communication Patterns

### Connection Flow
1. Client connects to `ws://domain/socket.io/`
2. Nginx proxies WebSocket connection to gameserver
3. GameServer authenticates with room/username
4. ConnectionManager tracks player in room-specific collections

### Game State Synchronization
- **Server → Client**: Game state updates (`changeScene`, `timer`, `endGame`)
- **Client → Server**: Player actions (`startGame`, `submitClue`, `guessWord`)
- **Room Broadcasting**: Different content for writers vs. guesser simultaneously
- **Thread Safety**: PQueue ensures atomic state operations

## Game Flow Architecture

### Round-Robin Turn System
Each player becomes the guesser in rotation:

1. **Category Phase**: All players vote on word categories
2. **Clue Writing**: Writers submit clues for secret word (guesser sees loading screen)
3. **Voting Phase**: Writers eliminate duplicate/similar clues
4. **Guessing Phase**: Guesser sees filtered clues and makes guess
5. **Results Phase**: Success/failure shown with statistics

### State Management
- **GameStateManager**: Centralized, thread-safe game state
- **Room Isolation**: Each game room maintains independent state
- **Data Validation**: Word stem comparison prevents clues matching secret words
- **Recovery**: Socket.IO connection state recovery for network interruptions

## Production Architecture

### Deployment Model
- **Development**: Frontend dev server + separate gameserver
- **Production**: AWS ECS with ALB for HTTPS termination and load balancing
- **Scalability**: Stateless frontend allows horizontal nginx scaling
- **SSL/TLS**: Handled by AWS Application Load Balancer, containers serve HTTP only
- **Monitoring**: Comprehensive logging and error tracking

### Data Architecture
- **Static Data**: Categories and words in `/gameserver/data/data.js`
- **Runtime State**: In-memory with concurrent access control
- **Word Processing**: Stem-based clue validation using `wordOperations.js`

### Environment Configuration
- **Environment Variables**: Configurable ports, URLs
- **AWS Integration**: ECS service definitions with ALB target groups
- **Docker Compose**: Orchestrates all three services with proper networking

## Key Design Decisions

1. **Static Frontend**: SvelteKit builds to static files for nginx serving (performance)
2. **Nginx Proxy**: Single entry point for static files and WebSocket proxying
3. **AWS ALB Integration**: HTTPS termination and load balancing handled by AWS infrastructure
4. **Thread-Safe Backend**: PQueue prevents race conditions in multiplayer state
5. **Room-based Architecture**: Isolated game instances with targeted broadcasting
6. **Docker-first**: Development and production use same containerized architecture

This architecture provides a scalable, maintainable real-time multiplayer experience with clear separation of concerns and production-ready deployment capabilities.