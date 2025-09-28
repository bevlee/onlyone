# OnlyOne Game Server API Reference

## Base URL
`http://localhost:3000` (default development)

## Authentication
The API uses Supabase authentication with session cookies. Most endpoints support optional authentication (anonymous users) or require authentication.

### Authentication Middleware Types:
- **requireAuth()**: Endpoint requires authenticated user
- **optionalAuth()**: Endpoint works for both authenticated and anonymous users
- **No auth**: Public endpoint

---

## Authentication Endpoints

### POST `/auth/register`
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

### POST `/auth/login`
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

### POST `/auth/logout`
🔒 **Requires Authentication**

Logout current user and clear session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET `/auth/me`
🔓 **Optional Authentication**

Get current authenticated user info.

**Response:**
```json
{
  "user": "SupabaseUser",
  "profile": "UserProfile"
}
```

---

### POST `/auth/reset-password`
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

## Game API Endpoints

### GET `/api/users/me/stats`
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

### GET `/api/users/me/games`
🔒 **Requires Authentication**

Get current user's game history.

**Query Parameters:**
- `limit`: Number of games to return (default: 10)

**Response:**
```json
[
  {
    "id": "string",
    "roomId": "string",
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

### GET `/api/leaderboard`
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

### GET `/lobby/rooms`
🌐 **Public**

Get list of all active game rooms.

**Response:**
```json
{
  "rooms": [
    {
      "roomId": "string",
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

### POST `/lobby/rooms/:roomId`
🔓 **Optional Authentication**

Join a specific room from the lobby. Supports both authenticated and anonymous users.

**Path Parameters:**
- `roomId`: ID of room to join

**Body (for anonymous users):**
```json
{
  "playerName": "string"
}
```

**Response:**
```json
{
  "message": "Successfully joined room",
  "room": {
    "roomId": "string",
    "playerCount": "number",
    "maxPlayers": "number",
    "roomLeader": "string"
  },
  "player": {
    "id": "string",
    "name": "string",
    "isAnonymous": "boolean"
  }
}
```

---

## Room Management Endpoints

### POST `/room/join`
🔧 **TODO - Not Implemented**

Join a room (legacy endpoint).

**Body:**
```json
{
  "roomId": "string"
}
```

---

### POST `/room/leave`
🔧 **TODO - Not Implemented**

Leave current room.

**Response:**
```json
{
  "message": "Successfully left room",
  "formerRoomId": "string"
}
```

---

### GET `/room/status`
🔧 **TODO - Not Implemented**

Get current room status and details.

**Response:**
```json
{
  "roomId": "string",
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

### GET `/room/players`
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

### POST `/room/kick/:playerId`
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

### POST `/room/invite`
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

### POST `/room/start`
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

### POST `/room/stop`
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

### GET `/health`
🌐 **Public**

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "ISO8601"
}
```

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

Most room management endpoints (`/room/*`) are placeholder implementations and need to be completed. The primary functional endpoints are authentication (`/auth/*`), game API (`/api/*`), and lobby (`/lobby/*`) endpoints.

Real-time gameplay features would typically be handled via WebSocket connections, which are not yet implemented in this API.