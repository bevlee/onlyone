# OnlyOne Game Server API Reference

## Base URL

`http://localhost:3000/gameserver` (default development)

**Note:** All endpoints are prefixed with `/gameserver` to prevent conflicts with frontend routes.

## Authentication

The API uses Supabase authentication with session cookies. Most endpoints support optional authentication (anonymous users) or require authentication.

### Authentication Middleware Types:

- **requireAuth()**: Endpoint requires authenticated user
- **optionalAuth()**: Endpoint works for both authenticated and anonymous users
- **No auth**: Public endpoint

---

## Authentication Endpoints

### POST `/gameserver/auth/register`

Register a new user account.

**Body:**

```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "user": "SupabaseUser",
  "session": "SupabaseSession",
  "isNewUser": true
}
```

---

### POST `/gameserver/auth/login`

Login with email and password.

**Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "user": "SupabaseUser",
  "session": "SupabaseSession",
  "isNewUser": false
}
```

---

### POST `/gameserver/auth/logout`

🔒 **Requires Authentication**

Logout current user and clear session.

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

---

### POST `/gameserver/auth/anonymous`

Create an anonymous user account for guest play.

**Response:**

```json
{
  "user": "SupabaseUser",
  "session": "SupabaseSession",
  "isAnonymous": true
}
```

---

### POST `/gameserver/auth/upgrade`

🔒 **Requires Authentication** (must be anonymous user)

Upgrade an anonymous account to a full account.

**Body:**

```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "user": "SupabaseUser",
  "profile": "UserProfile",
  "message": "Account upgraded successfully"
}
```

---

### GET `/gameserver/auth/me`

🔓 **Optional Authentication**

Get current authenticated user info.

**Response (authenticated):**

```json
{
  "user": "SupabaseUser",
  "profile": "UserProfile",
  "isAnonymous": false
}
```

**Response (not authenticated):**

```json
{
  "error": "Not authenticated"
}
```

---

### POST `/gameserver/auth/reset-password`

Send password reset email.

**Body:**

```json
{
  "email": "string"
}
```

**Response:**

```json
{
  "message": "Password reset email sent"
}
```

---

### POST `/gameserver/auth/avatar`

🔒 **Requires Authentication**

Upload or update user avatar.

**Body:**

```json
{
  "avatar": "base64_encoded_image_or_url"
}
```

**Response:**

```json
{
  "message": "Avatar updated successfully",
  "avatarUrl": "string"
}
```

---

## Game API Endpoints

### GET `/gameserver/api/users/me/stats`

🔒 **Requires Authentication**

Get current user's game statistics.

**Query Parameters:**

- Period defaults to 30 days

**Response:**

```json
{
  "gamesPlayed": "number",
  "gamesWon": "number",
  "winRate": "number",
  "averageTime": "number"
}
```

---

### GET `/gameserver/api/users/me/games`

🔒 **Requires Authentication**

Get current user's game history.

**Query Parameters:**

- `limit`: Number of games to return (default: 10)

**Response:**

```json
[
  {
    "id": "string",
    "roomName": "string",
    "success": "boolean",
    "secretWord": "string",
    "finalGuess": "string",
    "startTime": "ISO8601",
    "endTime": "ISO8601",
    "durationSeconds": "number"
  }
]
```

---

### GET `/gameserver/api/leaderboard`

🔓 **Optional Authentication**

Get top players leaderboard.

**Query Parameters:**

- `limit`: Number of players to return (default: 10)

**Response:**

```json
[
  {
    "id": "string",
    "name": "string",
    "gamesPlayed": "number",
    "gamesWon": "number",
    "winRate": "number"
  }
]
```

---

## Lobby Endpoints

### GET `/gameserver/lobby/rooms`

🌐 **Public**

Get list of all active game rooms.

**Response:**

```json
{
  "rooms": [
    {
      "roomName": "string",
      "playerCount": "number",
      "maxPlayers": "number",
      "status": "waiting|playing|finished",
      "roomLeader": "string"
    }
  ],
  "total": "number"
}
```

---

## Room Management Endpoints

### POST `/gameserver/room`

🔒 **Requires Authentication**

Create a new game room.

**Body:**

```json
{
  "roomName": "string"
}
```

**Response:**

```json
{
  "message": "Room created successfully",
  "room": {
    "roomName": "string",
    "playerCount": "number",
    "maxPlayers": "number",
    "roomLeader": "string"
  }
}
```

---

### GET `/gameserver/room/:roomName/status`

🔒 **Requires Authentication**

Check if the current user can join a specific room.

**Path Parameters:**

- `roomName`: Name of the room to check

**Response (can join):**

```json
{
  "canJoin": true,
  "alreadyJoined": false,
  "isFull": false,
  "reason": null,
  "room": {
    "roomName": "string",
    "playerCount": "number",
    "maxPlayers": "number",
    "status": "waiting|playing|finished"
  }
}
```

**Response (room full):**

```json
{
  "canJoin": false,
  "alreadyJoined": false,
  "isFull": true,
  "reason": "Room is full",
  "room": {
    "roomName": "string",
    "playerCount": "number",
    "maxPlayers": "number",
    "status": "waiting"
  }
}
```

**Response (room not found - 404):**

```json
{
  "canJoin": false,
  "alreadyJoined": false,
  "isFull": false,
  "reason": "Room not found",
  "room": null
}
```

---

### POST `/gameserver/room/:roomName/join`

🔒 **Requires Authentication**

Join a specific room. This endpoint is **idempotent** - calling it multiple times has the same effect.

**Path Parameters:**

- `roomName`: Name of the room to join

**Response (first join):**

```json
{
  "message": "Successfully joined room",
  "alreadyJoined": false,
  "room": {
    "roomName": "string",
    "playerCount": "number",
    "maxPlayers": "number",
    "roomLeader": "string"
  },
  "player": {
    "id": "string",
    "name": "string"
  }
}
```

**Response (already joined):**

```json
{
  "message": "Already in room",
  "alreadyJoined": true,
  "room": {
    "roomName": "string",
    "playerCount": "number",
    "maxPlayers": "number",
    "roomLeader": "string"
  },
  "player": {
    "id": "string",
    "name": "string"
  }
}
```

**Error Response (room full):**

```json
{
  "error": "Room is full"
}
```

---

### POST `/gameserver/room/leave`

🔧 **TODO - Not Implemented**

Leave current room.

**Response:**

```json
{
  "message": "Successfully left room",
  "formerroomName": "string"
}
```

---

### GET `/gameserver/room/status`

🔧 **TODO - Not Implemented**

Get current room status and details.

**Response:**

```json
{
  "roomName": "string",
  "name": "string",
  "status": "waiting|playing|finished",
  "players": [
    {
      "id": "string",
      "name": "string",
      "isOwner": "boolean"
    }
  ],
  "maxPlayers": "number",
  "gameState": "object|null",
  "settings": {
    "timeLimit": "number"
  }
}
```

---

### GET `/gameserver/room/players`

🔧 **TODO - Not Implemented**

Get players in current room.

**Response:**

```json
{
  "players": [
    {
      "id": "string",
      "name": "string",
      "isOwner": "boolean",
      "stats": {
        "gamesPlayed": "number",
        "gamesWon": "number"
      }
    }
  ],
  "playerCount": "number",
  "maxPlayers": "number"
}
```

---

### POST `/gameserver/room/kick/:playerId`

🔧 **TODO - Not Implemented**

Kick a player from room (room owner only).

**Path Parameters:**

- `playerId`: ID of player to kick

**Body:**

```json
{
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Player {playerId} has been kicked from the room",
  "kickedPlayerId": "string",
  "reason": "string"
}
```

---

### POST `/gameserver/room/invite`

🔧 **TODO - Not Implemented**

Invite a player to current room.

**Body:**

```json
{
  "playerName": "string",
  "playerId": "string"
}
```

**Response:**

```json
{
  "message": "Invitation sent to {player}",
  "invitationId": "string",
  "expiresAt": "ISO8601"
}
```

---

### POST `/gameserver/room/start`

🔧 **TODO - Not Implemented**

Start game in current room (room owner only).

**Response:**

```json
{
  "message": "Game started successfully",
  "gameId": "string",
  "gameState": {
    "status": "playing",
    "startedAt": "ISO8601",
    "currentPhase": "string",
    "timeRemaining": "number"
  }
}
```

---

### POST `/gameserver/room/stop`

🔧 **TODO - Not Implemented**

Stop/end current game (room owner only).

**Body:**

```json
{
  "reason": "string"
}
```

**Response:**

```json
{
  "message": "Game stopped successfully",
  "reason": "string",
  "finalGameState": {
    "status": "stopped",
    "duration": "number",
    "winner": "string|null"
  }
}
```

---

## Health & Status

### GET `/gameserver/health`

🌐 **Public**

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "ok",
  "service": "gameserver",
  "timestamp": "ISO8601"
}
```

---

## WebSocket Connection

### Socket.IO Endpoint

**URL:** `ws://localhost:3000/gameserver/socket.io`

**Authentication:** Pass credentials in handshake

```javascript
const socket = io('http://localhost:3000', {
  path: '/gameserver/socket.io',
  auth: { roomName, playerName, playerId },
  withCredentials: true
});
```

**Events:**

- `connect`: Connection established
- `disconnect`: Connection lost
- `error`: Server error (room not found, player not in room, etc.)
- `roomState`: Current room state sent to new connections
- `playerJoined`: Broadcast when a player joins
- `playerLeft`: Broadcast when a player leaves
- `chatMessage`: Chat message sent/received

**Client Events:**

- `chatMessage`: Send a chat message
- `startGame`: Request to start the game (room leader only)

---

## Architecture Notes

### Room Joining Flow

1. **HTTP Join First**: Players must join via `POST /gameserver/room/:roomName/join` before connecting WebSocket
2. **WebSocket for Updates**: WebSocket is used only for real-time state synchronization
3. **Idempotent Join**: Safe to call join endpoint multiple times
4. **Load Function Validation**: Frontend uses load functions to check room access before rendering

### Authentication Flow

1. **Anonymous Users**: Can create temporary accounts via `/gameserver/auth/anonymous`
2. **Account Upgrade**: Anonymous users can upgrade to full accounts
3. **Session Cookies**: Authentication uses `sb-access-token` and `sb-refresh-token` cookies
4. **Deep Linking**: Unauthenticated users are redirected with `returnTo` parameter

---

## Error Responses

All endpoints may return these error formats:

**400 Bad Request:**

```json
{
  "error": "Error message describing what went wrong"
}
```

**401 Unauthorized:**

```json
{
  "error": "Not authenticated"
}
```

**404 Not Found:**

```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal server error"
}
```

---

## Notes

- **🔒 Requires Authentication**: Endpoint requires valid user session
- **🔓 Optional Authentication**: Endpoint works for both authenticated and anonymous users
- **🌐 Public**: Endpoint is publicly accessible
- **🔧 TODO**: Endpoint exists but implementation is incomplete

The primary functional endpoints are:
- Authentication (`/gameserver/auth/*`)
- Game API (`/gameserver/api/*`)
- Lobby (`/gameserver/lobby/*`)
- Room Management (`/gameserver/room/*`) - partially implemented

Real-time features are handled via WebSocket connections at `/gameserver/socket.io`.
