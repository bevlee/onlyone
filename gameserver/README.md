# Game Server

Real-time multiplayer word-guessing game server built with TypeScript, Express, and Socket.IO.

## APIs

### Room Management

- `getActiveRooms` - Get list of all active game rooms
- `joinRoom` - Join an existing room by name
- `leaveRoom` - Leave current room
- `createRoom` - Create a new game room
- `getRoomDetails` - Get details of current room
- `deleteRoom` - Delete an existing room

## Tech Stack

- TypeScript with ES modules
- Express.js for HTTP server
- Socket.IO for real-time communication
- Pino for logging
- Better SQLite3 for data persistence

## State Synchronization Strategy

### Phase-Based Full State Sync

The game uses **phase boundaries** as natural state consolidation points to maintain client-server synchronization:

#### Full State Updates
- **Phase transitions** - Complete game state sent to all clients
- **Reconnections** - Clients get complete current state
- **Game logic changes** - When player actions affect active game state

#### Delta Updates
- **Player roster changes** - Join/leave events (unless affecting game logic)
- **Mid-phase updates** - Targeted events (clue submitted, vote cast)
- **Real-time feedback** - Quick updates without full state overhead

#### Player Join/Leave Logic
```typescript
// Delta update - simple roster change
playerJoined → { player, playerCount }
playerLeft → { playerId, playerCount }

// Full state update - affects active game
currentGuesserLeft → complete game state + new guesser
```

#### Phase Transition Events
```typescript
'choosing-difficulty' → full state + available difficulties
'writing-clues' → full state + secret word + time limit
'filtering-clues' → full state + all clues to filter
'guessing-word' → full state + filtered clues
'end-game' → full state + results
```

#### Benefits
- **Prevents state drift** - Regular sync points
- **Handles disconnections** - Mid-phase joiners get full context
- **Performance balance** - Full state periodically, deltas in between
- **Debugging friendly** - Clear checkpoints for state validation

## Development

```bash
npm install
npm run dev
```
