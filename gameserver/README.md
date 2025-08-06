### Directory Structure

```
gameserver/
├── config/
│   └── serverConfig.js       # Express and Socket.IO server configuration
├── modules/
│   ├── connectionManager.js  # Player connection management
│   ├── gameStateManager.js   # Game state and data management
│   └── gameLoop.js          # Main game loop logic
├── utils/
│   └── gameUtils.js         # Utility functions
├── handlers/
│   ├── gameHandlers.js      # Socket event handlers for game actions
│   └── chatHandlers.js      # Socket event handlers for chat and player management
├── index.js                 # Main server entry point (now ~75 lines vs 282)
└── config.js               # Game categories and secret words
```

### Key Modules

- **ConnectionManager**: Manages player connections per room, handles join/leave operations
- **GameStateManager**: Centralized game state management with methods for updating game phases
- **GameLoop**: Extracted 120+ line game loop into manageable phases (category, clue, voting, guessing)
- **Server Config**: Separated Express and Socket.IO setup from business logic
- **Chat Handlers**: Handles chat messages, player name changes, and disconnections with proper event emission

### Socket Events

#### Chat & Player Management

- `changeName`: Changes player name with validation and emits `playerNameChanged` event
- `playerNameChanged`: Emitted when a player successfully changes their name
- `playerJoined`: Emitted when a new player joins a room
- `playerLeft`: Emitted when a player leaves a room or disconnects

### HTTP Communication & Deployment

This gameserver is configured for HTTP-only communication:

- **Port**: 3000
- **Protocol**: HTTP
- **CORS**: Configured for HTTP frontend origin (`http://localhost:5173`)
- **WebSocket**: Uses `ws://` protocol
- **Deployment**: Designed for AWS ECS with ALB load balancer

### Testing

Run tests with:

```bash
npm test
```

Test coverage includes:

- Game handlers (start/stop game, category selection, clue submission, voting, guessing)
- Chat handlers (name changes, disconnections, chat messages)
- Connection management
- Game state management
- Utility functions
