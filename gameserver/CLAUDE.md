# OnlyOne Gameserver - Claude Context

## Project Overview

A real-time multiplayer word-guessing game server built with Socket.IO and Express. Players take turns being the "guesser" while others write clues for a secret word. The game includes difficulty selection, clue writing, voting to eliminate duplicates, and guessing phases.

## Architecture & Design Patterns

### Modular Architecture

The server follows a modular pattern with separated concerns:

- **ConnectionManager**: Manages player connections and room assignments
- **GameStateManager**: Thread-safe game state management using p-queue for concurrency control
- **GameLoop**: Orchestrates game phases and timing
- **Event Handlers**: Separate modules for chat and game event handling

### Key Design Decisions

- **Thread Safety**: GameStateManager uses p-queue (concurrency: 1) to prevent race conditions
- **Room-based Architecture**: Players are organized in rooms with sub-rooms (`.writer`, `.guesser`)
- **Immutable Game Phases**: Clear stage transitions with state validation
- **Dependency Injection**: GameLoop receives managers and utilities as parameters

## Project Structure

```
gameserver/
├── config/
│   ├── logger.js              # Pino logger with rotating file streams
│   └── serverConfig.js        # Express and Socket.IO configuration
├── data/
│   └── data.js               # Game difficulty levels and secret words
├── handlers/
│   └── chatHandlers.js       # Chat and player management events
├── modules/
│   ├── connectionManager.js  # Player connection management
│   ├── gameLoop.js          # Main game orchestration
│   └── gameStateManager.js   # Thread-safe state management
├── test/                     # Mocha/Chai/Sinon test suite
├── utils/
│   └── gameUtils.js         # Game utility functions
├── logs/                    # Rotating log files
├── index.js                 # Server entry point
└── wordOperations.js/ts     # Word processing utilities
```

## Dependencies & Stack

### Core Dependencies

- **express** (4.21.2): HTTP server framework
- **socket.io** (4.8.1): Real-time bidirectional communication
- **p-queue** (8.1.0): Promise-based queue for concurrency control
- **pino** (8.17.2): High-performance JSON logging
- **rotating-file-stream** (3.2.1): Log rotation
- **sqlite3** (5.1.7): Database (currently unused but available)

### Dev Dependencies

- **mocha** (10.2.0): Test framework
- **chai** (4.3.10): Assertion library
- **sinon** (17.0.1): Test spies, stubs, and mocks

## Game Flow & Business Logic

### Game Phases

1. **chooseDifficulty**: Guesser selects from available difficulty levels
2. **writeClues**: Writers submit clues for the secret word
3. **filterClues**: Writers vote to eliminate duplicate clues
4. **guessWord**: Guesser attempts to guess the secret word

### Room Structure

- `room123` - All players in the game
- `room123.writer` - Current clue writers
- `room123.guesser` - Current guesser

### Game State Example

```javascript
{
  stage: "guessWord",
  difficulty: "easy",
  secretWord: "cat",
  gamesPlayed: 2,
  gamesWon: 1,
  playerCount: 3,
  clues: ["furry", "pet", "meow"],
  votes: [0, 0, -1],
  finishedVoting: true,
  guess: "cat",
  success: true,
  dedupedClues: ["furry", "pet", "<redacted>"]
}
```

## Development Workflow

### Commands

```bash
npm start          # Start the server (port 3000)
npm test           # Run test suite with Mocha
```

### Testing Approach

- **Unit Tests**: Each module has comprehensive test coverage
- **Test Structure**: Mocha with Chai assertions and Sinon for mocking
- **Mock Strategy**: Socket.IO events are mocked for isolated testing
- **Test Files**: Mirror the source structure in `test/` directory

### Logging

- **Production**: Writes to rotating files in `logs/` directory
- **Development**: Console output with pino-pretty formatting
- **Log Levels**: debug, info, error with appropriate routing
- **Rotation**: Daily rotation, 10MB size limit, 30-day retention

## Socket Events

### Game Events

- `startGame`: Initialize game loop for a room
- `stopGame`: End current game and cleanup
- `chooseDifficulty`: Guesser selects difficulty
- `submitClue`: Writer submits a clue
- `updateVotes`: Vote on clue elimination
- `finishVoting`: Mark voting phase complete
- `guessWord`: Guesser submits final guess

### Chat & Player Events

- `chat message`: Send chat message to room
- `changeName`: Change player username
- `playerJoined`: Emitted when player joins
- `playerLeft`: Emitted when player disconnects

## Code Conventions

### Naming Patterns

- **Classes**: PascalCase (`GameStateManager`)
- **Methods**: camelCase (`addConnection`)
- **Constants**: camelCase exports (`difficulties`, `secretWords`)
- **Files**: camelCase with descriptive names

### Error Handling

- **Async Operations**: Use try/catch with detailed logging
- **Queue Operations**: Timeout protection (10s) with error propagation
- **State Validation**: Return success/failure objects with reasons

### Documentation Style

- **JSDoc Comments**: Comprehensive parameter and return documentation
- **Inline Comments**: Explain business logic and complex operations
- **Example Data**: Include sample data structures in comments

## Important Notes

### Authentication

- Players authenticate via `socket.handshake.auth` containing `username` and `room`
- No persistent authentication - relies on socket session

### Concurrency

- GameStateManager uses p-queue to prevent race conditions
- One operation per room at a time with 10-second timeout
- Queue clearing on stage transitions prevents stale operations

### TypeScript Migration

- Project has both `.js` and `.ts` files (wordOperations)
- `tsconfig.json` present but not fully migrated
- Consider completing TypeScript migration for better type safety

### Performance Considerations

- Room-based broadcasting reduces unnecessary network traffic
- Structured logging for monitoring and debugging
- Memory management through game state cleanup after completion
