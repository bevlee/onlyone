# Authentication Components - Inputs and Outputs

This document describes the inputs and outputs of all authentication components in the OnlyOne application.

## Backend Components

### 1. SupabaseAuthService ([src/services/SupabaseAuthService.ts](apps/gameserver/src/services/SupabaseAuthService.ts))

Core authentication service that interfaces with Supabase Auth.

#### Methods:

**registerWithPassword**
- Inputs:
  - `name: string` - User's display name
  - `email: string` - User's email
  - `password: string` - User's password
- Outputs:
  - `AuthResult` object containing:
    - `user: SupabaseUser` - Supabase user object with id, email, metadata
    - `session: any` - Session with access_token, refresh_token, expires_in
    - `isNewUser: boolean` - Always true for registration

**loginWithPassword**
- Inputs:
  - `email: string` - User's email
  - `password: string` - User's password
- Outputs:
  - `AuthResult` object containing:
    - `user: SupabaseUser` - Authenticated user
    - `session: any` - Session tokens
    - `isNewUser: boolean` - Always false for login

**signInAnonymously**
- Inputs: None
- Outputs:
  - `AuthResult` object containing:
    - `user: SupabaseUser` - Anonymous user with generated name
    - `session: any` - Session tokens
    - `isNewUser: boolean` - Always true
- Side effects: Generates unique username using adjectives and animals

**upgradeAnonymousUser**
- Inputs:
  - `name: string` - New permanent name
  - `email: string` - Email for permanent account
  - `password: string` - Password for permanent account
- Outputs:
  - `AuthResult` object containing:
    - `user: SupabaseUser` - Upgraded user
    - `session: any` - New session tokens
    - `isNewUser: boolean` - Always false

**getUserFromToken**
- Inputs:
  - `token: string` - JWT access token
- Outputs:
  - `SupabaseUser | null` - Decoded user from JWT, or null if invalid/expired
- Validation:
  - Checks token expiration
  - Validates issuer matches Supabase URL

**refreshSession**
- Inputs:
  - `refreshToken: string` - Refresh token
- Outputs:
  - `{ session: any; user: SupabaseUser } | null` - New session and user, or null if failed

**signOut**
- Inputs: None
- Outputs: `void` (throws error on failure)

**resetPassword**
- Inputs:
  - `email: string` - Email to send reset link to
- Outputs: `void` (throws error on failure)
- Side effects: Sends password reset email with redirect to frontend

**updatePassword**
- Inputs:
  - `newPassword: string` - New password
- Outputs: `void` (throws error on failure)

**signInWithOAuth**
- Inputs:
  - `provider: 'google' | 'discord'` - OAuth provider
- Outputs:
  - `{ url: string }` - OAuth authorization URL

---

### 2. SupabaseAuthMiddleware ([src/middleware/supabase-auth.ts](apps/gameserver/src/middleware/supabase-auth.ts))

Express middleware for authentication and authorization.

#### Methods:

**optionalAuth()**
- Returns: Express middleware function
- Inputs (via Express request):
  - Cookies: `sb-access-token`, `sb-refresh-token`
- Outputs (sets on Express request):
  - `req.user?: SupabaseUser` - Authenticated user if valid token
  - `req.userProfile?: DbUser` - User profile from database
  - `req.isAnonymous?: boolean` - Whether user is anonymous
- Behavior:
  - Tries access token first
  - Falls back to refresh token if access token invalid
  - Auto-creates user profile if missing
  - Continues without error if no valid auth

**requireAuth()**
- Returns: Express middleware function
- Inputs (via Express request):
  - Cookies: `sb-access-token`, `sb-refresh-token`
- Outputs:
  - Success: Sets `req.user`, `req.userProfile`, `req.isAnonymous`
  - Failure: Returns 401 JSON response with error
- Behavior:
  - Same as optionalAuth but returns 401 if no valid authentication

**setAuthCookies()**
- Inputs:
  - `res: Response` - Express response object
  - `session: any` - Session object with access_token, refresh_token, expires_in
- Outputs: None (sets cookies on response)
- Cookies set:
  - `sb-access-token`: Expires based on session.expires_in
  - `sb-refresh-token`: Expires in 7 days
  - Both: httpOnly, secure (in production), sameSite: 'lax'

**clearAuthCookies()**
- Inputs:
  - `res: Response` - Express response object
- Outputs: None (clears cookies)
- Cookies cleared:
  - `sb-access-token`
  - `sb-refresh-token`

**getOrRefreshSession()** (private)
- Inputs:
  - `refreshToken: string` - Refresh token
- Outputs:
  - `{ session: any; user: SupabaseUser } | null`
- Behavior:
  - Deduplicates concurrent refresh requests for same token
  - Prevents refresh token reuse issues

---

### 3. Auth Routes ([src/routes/auth.ts](apps/gameserver/src/routes/auth.ts))

Express routes handling authentication HTTP endpoints.

#### Endpoints:

**POST /auth/register**
- Inputs (JSON body):
  - `name: string` - Display name
  - `email: string` - Email
  - `password: string` - Password
- Outputs (200):
  ```json
  {
    "user": SupabaseUser,
    "session": Session,
    "isNewUser": boolean
  }
  ```
- Errors (400): `{ "error": string }`
- Side effects: Sets auth cookies

**POST /auth/login**
- Inputs (JSON body):
  - `email: string`
  - `password: string`
- Outputs (200):
  ```json
  {
    "user": SupabaseUser,
    "session": Session,
    "isNewUser": boolean
  }
  ```
- Errors (400): `{ "error": string }`
- Side effects: Sets auth cookies

**POST /auth/anonymous**
- Inputs: None (empty body)
- Outputs (200):
  ```json
  {
    "auth": SupabaseUser,
    "session": Session,
    "isNewUser": boolean,
    "isAnonymous": true
  }
  ```
- Errors (400): `{ "error": string }`
- Side effects: Sets auth cookies

**POST /auth/upgrade** (requires auth)
- Inputs (JSON body):
  - `name: string`
  - `email: string`
  - `password: string`
- Outputs (200):
  ```json
  {
    "user": SupabaseUser,
    "session": Session,
    "message": "Account upgraded successfully"
  }
  ```
- Errors:
  - 400: `{ "error": "Only anonymous users can upgrade their account" }`
  - 400: `{ "error": string }` (other errors)
- Side effects: Sets new auth cookies, updates database email

**POST /auth/logout** (requires auth)
- Inputs: None
- Outputs (200):
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- Errors (500): `{ "error": string }`
- Side effects: Clears auth cookies

**GET /auth/me** (optional auth)
- Inputs: None (uses cookies)
- Outputs (200):
  ```json
  {
    "auth": SupabaseUser,
    "profile": UserProfile,
    "isAnonymous": boolean,
    "expiresAt": number | undefined
  }
  ```
- Errors (401): `{ "error": "Not authenticated" }`
- Side effects: Attempts token refresh if access token expired

**POST /auth/avatar** (requires auth)
- Inputs (JSON body):
  - `avatar: string` - Base64 encoded image
- Outputs (200):
  ```json
  {
    "message": "Avatar uploaded successfully",
    "avatarUrl": string
  }
  ```
- Errors:
  - 400: `{ "error": "Avatar data is required" }`
  - 500: `{ "error": string }`
- Side effects: Uploads to storage, updates database

**POST /auth/reset-password**
- Inputs (JSON body):
  - `email: string`
- Outputs (200):
  ```json
  {
    "message": "Password reset email sent"
  }
  ```
- Errors (400): `{ "error": string }`
- Side effects: Sends password reset email

---

## Frontend Components

### 4. GameServerAPI ([src/lib/api/gameserver.ts](apps/frontend/src/lib/api/gameserver.ts))

Client-side API wrapper for gameserver endpoints.

#### Authentication Methods:

**register()**
- Inputs:
  - `name: string`
  - `email: string`
  - `password: string`
- Outputs:
  - `ApiResponse<AuthResponse>` containing:
    ```typescript
    {
      success: boolean,
      data?: {
        auth: { id, email, user_metadata },
        session: { access_token, refresh_token, expires_in, token_type },
        isNewUser?: boolean
      },
      error?: string
    }
    ```

**login()**
- Inputs:
  - `email: string`
  - `password: string`
- Outputs: Same as register()

**signInAnonymous()**
- Inputs: None
- Outputs: Same as register(), with `isNewUser: true`

**upgradeAccount()**
- Inputs:
  - `name: string`
  - `email: string`
  - `password: string`
- Outputs: Same as register()

**logout()**
- Inputs: None
- Outputs:
  ```typescript
  {
    success: boolean,
    error?: string
  }
  ```

**getMe()**
- Inputs: None (uses cookies)
- Outputs:
  - `ApiResponse<MeResponse>` containing:
    ```typescript
    {
      success: boolean,
      data?: {
        auth: { id, email, user_metadata },
        profile: {
          id, name, email, avatar_url,
          gamesPlayed, gamesWon
        },
        isAnonymous?: boolean,
        expiresAt?: number
      },
      error?: string
    }
    ```

**uploadAvatar()**
- Inputs:
  - `avatarBase64: string` - Base64 encoded image
- Outputs:
  ```typescript
  {
    success: boolean,
    data?: {
      message: string,
      avatarUrl: string
    },
    error?: string
  }
  ```

**resetPassword()**
- Inputs:
  - `email: string`
- Outputs:
  ```typescript
  {
    success: boolean,
    error?: string
  }
  ```

#### Internal Methods:

**request()** (private)
- Inputs:
  - `endpoint: string`
  - `options: RequestInit`
  - `isRetry: boolean`
- Outputs: `ApiResponse<T>`
- Behavior:
  - 30-second timeout
  - Auto-includes credentials (cookies) in browser
  - Auto-retry on 401 by calling /auth/me to trigger token refresh
  - Prevents infinite retry loop with isRetry flag

---

### 5. WebSocket Store ([src/lib/services/websocket.svelte.ts](apps/frontend/src/lib/services/websocket.svelte.ts))

Svelte store managing WebSocket connection to game server.

#### Methods:

**connect()**
- Inputs:
  - `roomName: string`
  - `playerName: string`
  - `playerId: string`
- Outputs: None
- Side effects:
  - Creates Socket.IO connection
  - Sends auth via `auth` parameter in connection
  - Sets `withCredentials: true` to send cookies
  - Updates reactive state

**Socket.IO Connection**
- Auth inputs sent on connect:
  ```typescript
  {
    roomName: string,
    playerName: string,
    playerId: string
  }
  ```
- Configuration:
  - Path: `/socket.io`
  - Credentials: `withCredentials: true` (sends cookies)
  - Reconnection enabled

**State outputs** (reactive):
```typescript
{
  connected: boolean,
  room: Room | null,
  error: string | null,
  messages: ChatMessage[],
  kickedPlayerId: string | null
}
```

**disconnect()**
- Inputs: None
- Outputs: None
- Side effects: Closes socket, clears state

---

## Data Flow Summary

### Registration/Login Flow:
1. **Frontend**: User enters credentials
2. **Frontend**: `GameServerAPI.register()` or `.login()` POSTs to `/auth/register` or `/auth/login`
3. **Backend**: `auth.ts` routes receive request
4. **Backend**: `SupabaseAuthService` calls Supabase Auth API
5. **Backend**: `SupabaseAuthMiddleware.setAuthCookies()` sets cookies on response
6. **Backend**: Returns user + session + isNewUser
7. **Frontend**: Receives response with auth data

### Anonymous Sign-In Flow:
1. **Frontend**: `GameServerAPI.signInAnonymous()` POSTs to `/auth/anonymous`
2. **Backend**: `SupabaseAuthService.signInAnonymously()` generates unique name
3. **Backend**: Creates anonymous Supabase user
4. **Backend**: Sets auth cookies
5. **Backend**: Returns auth data with `isAnonymous: true`
6. **Frontend**: Receives anonymous user credentials

### Token Refresh Flow:
1. **Frontend**: API request receives 401 response
2. **Frontend**: `GameServerAPI.request()` calls `getMe()`
3. **Backend**: `optionalAuth()` middleware extracts access token
4. **Backend**: Access token expired, tries refresh token
5. **Backend**: `getOrRefreshSession()` calls Supabase to refresh
6. **Backend**: `setAuthCookies()` updates cookies with new tokens
7. **Backend**: Returns user data
8. **Frontend**: Retries original request with new cookies

### WebSocket Authentication Flow:
1. **Frontend**: `websocketStore.connect()` creates Socket.IO connection
2. **Frontend**: Includes cookies via `withCredentials: true`
3. **Frontend**: Sends roomName, playerName, playerId in auth handshake
4. **Backend**: Socket.IO receives connection with cookies
5. **Backend**: Auth middleware can validate cookies if needed
6. **Backend**: Emits `roomState` and other events

### Cookie-Based Auth:
**Cookies Set** (by backend):
- `sb-access-token`: JWT access token (expires per session.expires_in)
- `sb-refresh-token`: Refresh token (7 days)
- Both: httpOnly, secure (prod), sameSite: lax

**Cookies Read** (by backend middleware):
- From `req.cookies['sb-access-token']`
- From `req.cookies['sb-refresh-token']`

**Cookies Sent** (by frontend):
- Automatically via `credentials: 'include'` in fetch
- Automatically via `withCredentials: true` in Socket.IO

---

## Type Definitions

### SupabaseUser
```typescript
{
  id: string;
  aud: string;
  role: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata: any;
  user_metadata: any;
  identities?: any[];
  created_at: string;
  updated_at: string;
  is_anonymous?: boolean;
}
```

### Session
```typescript
{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}
```

### UserProfile
```typescript
{
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  gamesPlayed: number;
  gamesWon: number;
}
```

### UserData
```typescript
{
  auth: {
    id: string;
    email?: string;
    user_metadata?: { name?: string };
  };
  profile: UserProfile;
  isAnonymous?: boolean;
  expiresAt?: number;
}
```

### AuthResult
```typescript
{
  user: SupabaseUser;
  session: any;
  isNewUser: boolean;
}
```

---

## Security Notes

1. **JWT Validation**: Backend uses local JWT decoding with basic validation (expiry, issuer). Does not verify signature - relies on HTTPS and trusted cookie source.

2. **Cookie Security**:
   - httpOnly: Prevents JavaScript access
   - secure: HTTPS only in production
   - sameSite: 'lax': CSRF protection

3. **Token Refresh**: Deduplicated to prevent refresh token reuse issues

4. **Auto-Retry**: Frontend automatically retries 401 requests after token refresh (once only)

5. **Anonymous Users**: Can upgrade to permanent accounts, preserving user ID and game history
