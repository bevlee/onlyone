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
│   └── chatHandlers.js      # Socket event handlers for chat
├── index.js                 # Main server entry point (now ~75 lines vs 282)
└── config.js               # Game categories and secret words
```

### Key Modules

- **ConnectionManager**: Manages player connections per room, handles join/leave operations
- **GameStateManager**: Centralized game state management with methods for updating game phases
- **GameLoop**: Extracted 120+ line game loop into manageable phases (category, clue, voting, guessing)
- **Server Config**: Separated Express and Socket.IO setup from business logic
