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

#### Room Privacy Options

**Public Rooms** (Default)
- Visible in room browser/lobby
- Anyone can join without invitation
- Included in `getActiveRooms` responses
- Ideal for open matchmaking

**Private Rooms** (Future Feature)
- Not visible in public room listings
- Require invitation link or room code to join
- Hidden from `getActiveRooms` responses
- Perfect for playing with specific friends

*Note: Private room functionality is planned but not yet implemented. All rooms are currently public.*

## Tech Stack

- TypeScript with ES modules
- Express.js for HTTP server
- Socket.IO for real-time communication
- Supabase for authentication and user management
- Pino for logging
- Better SQLite3 for data persistence

## Authentication

The gameserver handles all authentication server-side using Supabase Auth:

### Architecture

- **Server-Side Only**: All auth logic runs on the gameserver
- **HttpOnly Cookies**: Tokens never exposed to client JavaScript
- **Automatic Token Refresh**: Middleware handles refresh transparently
- **JWT Validation**: Fast local JWT decoding with basic validation

### Authentication Endpoints

- `POST /auth/register` - Register with email and password
- `POST /auth/login` - Login with email and password
- `POST /auth/anonymous` - Create anonymous guest session
- `POST /auth/logout` - Clear auth cookies and end session
- `GET /auth/me` - Get current user session (used by frontend SSR)

### Middleware

**SupabaseAuthMiddleware** provides two modes:

1. **optionalAuth()** - Attaches user to request if authenticated, continues if not
2. **requireAuth()** - Returns 401 if no valid authentication

### Cookie Management

Authentication tokens are stored in httpOnly cookies:

- `sb-access-token` - Short-lived JWT (expires per session settings)
- `sb-refresh-token` - Long-lived token (7 days)

**Cookie Security:**
- HttpOnly: Prevents client-side JavaScript access
- Secure: HTTPS-only in production
- SameSite: 'lax' for CSRF protection
- Domain: Configurable via `COOKIE_DOMAIN` env var

### Token Refresh Flow

1. Client request includes httpOnly cookies
2. Middleware extracts `sb-access-token`
3. If token expired, middleware uses `sb-refresh-token`
4. New tokens automatically set in response cookies
5. Request continues with fresh session

**Deduplication:** Concurrent refresh requests are deduplicated to prevent refresh token reuse errors.

### User Profile Management

The middleware automatically:
- Creates user profiles in local database on first authentication
- Attaches `req.user` (Supabase auth user) and `req.userProfile` (local DB user)
- Tracks anonymous vs. permanent accounts via `isAnonymous` flag

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

## Commendation System

The EndGame phase includes a player commendation system with the following rules:

### Commendation Rules
- **Multiple commendations allowed** - Players can commend multiple clues
- **No takebacks** - Once a commendation is sent, it cannot be undone
- **Skip option** - Players can skip commending and reveal results immediately
- **One commendation per clue** - Players can vote either "helpful" OR "creative" per clue, not both
- **No self-commendation** - Players cannot commend their own clues
- **Anonymous during commending** - Clue authors are hidden until player chooses to reveal results

### Commendation Types
- **Helpful** - For clues that effectively help guess the word
- **Creative** - For clever, entertaining, or original clues

### User Flow
1. EndGame phase begins with anonymous clues displayed
2. Players can commend clues as helpful or creative (one type per clue)
3. Commendation buttons become disabled after use (no takebacks)
4. Players can click "Skip & See Results" at any time
5. Results reveal clue authors with commendation totals

## Development

```bash
npm install
npm run dev
```
