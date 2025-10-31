# OnlyOne Authentication Flow - Inputs & Outputs

This document maps all inputs and outputs for authentication components in the OnlyOne application.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Backend Components](#backend-components)
- [Frontend Components](#frontend-components)
- [Data Flow Diagrams](#data-flow-diagrams)

---

## Architecture Overview

The authentication system uses:
- **Supabase Auth** for authentication backend
- **JWT tokens** stored in httpOnly cookies (access + refresh tokens)
- **Express middleware** for session validation
- **SvelteKit hooks** for SSR authentication
- **GameServerAPI client** for frontend-backend communication

---

## Backend Components

### 1. SupabaseAuthService (`apps/gameserver/src/services/SupabaseAuthService.ts`)

Core authentication service that interfaces with Supabase.

#### Methods:

##### `registerWithPassword(name, email, password)`
**Inputs:**
- `name: string` - User's display name
- `email: string` - User's email address
- `password: string` - User's password

**Outputs:**
```typescript
{
  user: SupabaseUser,
  session: {
    access_token: string,
    refresh_token: string,
    expires_in: number,
    token_type: string
  },
  isNewUser: true
}
```

##### `loginWithPassword(email, password)`
**Inputs:**
- `email: string` - User's email address
- `password: string` - User's password

**Outputs:**
```typescript
{
  user: SupabaseUser,
  session: Session,
  isNewUser: false
}
```

##### `getUserFromToken(token)`
**Inputs:**
- `token: string` - JWT access token

**Outputs:**
- `SupabaseUser | null` - Decoded user object or null if invalid/expired

**Process:**
- Decodes JWT without verification (relies on HTTPS)
- Validates expiration timestamp
- Validates issuer matches Supabase URL
- Converts JWT payload to SupabaseUser format

##### `refreshSession(refreshToken)`
**Inputs:**
- `refreshToken: string` - JWT refresh token

**Outputs:**
```typescript
{
  session: Session,
  user: SupabaseUser
} | null
```

##### `signInAnonymously()`
**Inputs:** None

**Outputs:**
```typescript
{
  user: SupabaseUser,
  session: Session,
  isNewUser: true
}
```

**Process:**
- Generates unique guest name using `unique-names-generator`
- Checks database for name conflicts (max 10 attempts)
- Adds random suffix if needed for uniqueness
- Creates anonymous Supabase session

##### `upgradeAnonymousUser(name, email, password)`
**Inputs:**
- `name: string` - New user name
- `email: string` - Email to associate with account
- `password: string` - New password

**Outputs:**
```typescript
{
  user: SupabaseUser,
  session: Session,
  isNewUser: false
}
```

**Process:**
- Updates existing anonymous user with email/password
- Returns new session with permanent account

##### `signOut()`
**Inputs:** None
**Outputs:** `void` (throws error if failed)

##### `resetPassword(email)`
**Inputs:**
- `email: string` - Email to send reset link to

**Outputs:** `void` (throws error if failed)

**Side Effects:**
- Sends password reset email with redirect to `${FRONTEND_URL}/reset-password`

##### `signInWithOAuth(provider)`
**Inputs:**
- `provider: 'google' | 'discord'` - OAuth provider

**Outputs:**
```typescript
{
  url: string  // Redirect URL for OAuth flow
}
```

---

### 2. SupabaseAuthMiddleware (`apps/gameserver/src/middleware/supabase-auth.ts`)

Express middleware for request authentication.

#### Methods:

##### `extractToken(req)`
**Inputs:**
- `req: Request` - Express request object

**Outputs:**
- `string | null` - Access token from `sb-access-token` cookie

##### `getOrRefreshSession(refreshToken)`
**Inputs:**
- `refreshToken: string` - Refresh token

**Outputs:**
- `{ session: Session, user: SupabaseUser } | null`

**Features:**
- Deduplicates concurrent refresh requests using in-memory promise cache
- Prevents refresh token reuse issues

##### `optionalAuth()` - Middleware
**Inputs:**
- `req: Request` - Express request with cookies

**Outputs (attached to req):**
- `req.user?: SupabaseUser` - Authenticated user if valid token
- `req.userProfile?: DbUser` - User profile from database
- `req.isAnonymous?: boolean` - Whether user is anonymous

**Process:**
1. Extract access token from cookies
2. Decode and validate token
3. If expired/invalid, attempt refresh using refresh token
4. Set new cookies if refreshed
5. Fetch or auto-create user profile from database
6. Continue to next middleware (no auth required)

##### `requireAuth()` - Middleware
**Inputs:**
- `req: Request` - Express request with cookies

**Outputs:**
- Same as `optionalAuth()` OR 401 response if not authenticated

**Process:**
- Same as `optionalAuth()` but returns 401 if user not found

##### `setAuthCookies(res, session)`
**Inputs:**
- `res: Response` - Express response object
- `session: Session` - Session object with tokens

**Side Effects:**
- Sets `sb-access-token` cookie (expires with token, httpOnly, secure in prod)
- Sets `sb-refresh-token` cookie (7 days, httpOnly, secure in prod)
- Uses `COOKIE_DOMAIN` env var in production

##### `clearAuthCookies(res)`
**Inputs:**
- `res: Response` - Express response object

**Side Effects:**
- Clears `sb-access-token` and `sb-refresh-token` cookies

---

### 3. Auth Routes (`apps/gameserver/src/routes/auth.ts`)

Express router handling auth endpoints.

#### Endpoints:

##### `POST /auth/register`
**Inputs (request body):**
```typescript
{
  name: string,
  email: string,
  password: string
}
```

**Outputs (response):**
```typescript
{
  user: SupabaseUser,
  session: Session,
  isNewUser: boolean
}
```

**Side Effects:**
- Sets auth cookies via `setAuthCookies()`

##### `POST /auth/login`
**Inputs:**
```typescript
{
  email: string,
  password: string
}
```

**Outputs:**
```typescript
{
  user: SupabaseUser,
  session: Session,
  isNewUser: boolean
}
```

**Side Effects:**
- Sets auth cookies

##### `POST /auth/anonymous`
**Inputs:** Empty body `{}`

**Outputs:**
```typescript
{
  auth: SupabaseUser,
  session: Session,
  isNewUser: true,
  isAnonymous: true
}
```

**Side Effects:**
- Sets auth cookies

##### `POST /auth/upgrade` (requires auth)
**Inputs:**
```typescript
{
  name: string,
  email: string,
  password: string
}
```

**Validation:**
- Requires authenticated user
- User must be anonymous (`req.isAnonymous === true`)

**Outputs:**
```typescript
{
  user: SupabaseUser,
  session: Session,
  message: "Account upgraded successfully"
}
```

**Side Effects:**
- Updates user email in database
- Sets new auth cookies

##### `POST /auth/logout` (requires auth)
**Inputs:** None

**Outputs:**
```typescript
{
  message: "Logged out successfully"
}
```

**Side Effects:**
- Calls `signOut()` on Supabase
- Clears auth cookies

##### `GET /auth/me` (optional auth)
**Inputs:** None (uses cookies)

**Outputs:**
```typescript
{
  auth: SupabaseUser,
  profile: DbUser,
  isAnonymous: boolean,
  expiresAt?: number  // Unix timestamp
}
```

**Process:**
- Middleware attempts token refresh if needed
- Returns 401 if no valid session
- Extracts token expiry for frontend tracking

##### `POST /auth/avatar` (requires auth)
**Inputs:**
```typescript
{
  avatar: string  // Base64 encoded image
}
```

**Outputs:**
```typescript
{
  message: "Avatar uploaded successfully",
  avatarUrl: string
}
```

**Process:**
- Converts base64 to buffer
- Uploads to Supabase storage
- Updates user profile with avatar URL

##### `POST /auth/reset-password`
**Inputs:**
```typescript
{
  email: string
}
```

**Outputs:**
```typescript
{
  message: "Password reset email sent"
}
```

---

### 4. SupabaseDatabase (`apps/gameserver/src/services/SupabaseDatabase.ts`)

Database service for user profile management.

#### Auth-Related Methods:

##### `getUserById(id)`
**Inputs:**
- `id: string` - User profile ID (UUID)

**Outputs:**
- `DbUser | null`

##### `getUserByAuthId(authUserId)`
**Inputs:**
- `authUserId: string` - Supabase auth user ID

**Outputs:**
- `DbUser | null`

##### `getUserByEmail(email)`
**Inputs:**
- `email: string`

**Outputs:**
- `DbUser | null`

##### `createUser(authUserId, name, email?, isAnonymous?)`
**Inputs:**
- `authUserId: string` - Supabase auth user ID
- `name: string` - Display name
- `email?: string` - Optional email
- `isAnonymous?: boolean` - Default false

**Outputs:**
- `DbUser` - Created user profile

**Process:**
- Auto-generates guest name for anonymous users if no name provided
- Creates user in public.users table with initial stats (0 games)

##### `updateUserEmail(userId, email)`
**Inputs:**
- `userId: string` - User profile ID
- `email: string` - New email

**Outputs:** `void`

##### `uploadAvatar(userId, file, fileName)`
**Inputs:**
- `userId: string` - User profile ID
- `file: Buffer` - Image file data
- `fileName: string` - File name

**Outputs:**
- `string` - Public URL of uploaded avatar

**Process:**
- Uploads to `avatars` storage bucket
- Updates user profile with avatar URL

---

## Frontend Components

### 5. SvelteKit Server Hook (`apps/frontend/src/hooks.server.ts`)

Server-side authentication hook that runs on every request.

#### `handle` Hook

**Inputs:**
- `event: RequestEvent` - SvelteKit request event
- Request cookies (forwarded to gameserver)

**Outputs:**
- `event.locals.user: UserData | null` - Attached to event for use in pages

**Process:**
1. Skip auth for static assets
2. Extract cookie header
3. Check in-memory cache (LRU, max 1000 entries)
4. If cache miss, call `${GAMESERVER_URL}/auth/me` with cookies
5. Store result in cache
6. Attach user data to `event.locals`

**Cache Strategy:**
- Key: Full cookie string
- Value: User data or null
- Evicts oldest entry when size > 1000

---

### 6. Page Server Loads

#### `+layout.server.ts`

**Inputs:**
- `locals.user` from hooks

**Outputs:**
```typescript
{
  user: UserData | null
}
```

**Purpose:** Pass user session to all pages

#### `+page.server.ts` (Login Page)

**Inputs:**
- `locals.user` from hooks
- `url.searchParams.get('returnTo')` - Return URL after auth

**Outputs:**
```typescript
{
  returnTo: string | null
}
```

**Side Effects:**
- Redirects to `/lobby` or `returnTo` if already authenticated

---

### 7. GameServerAPI Client (`apps/frontend/src/lib/api/gameserver.ts`)

Client-side API wrapper for gameserver communication.

#### Constructor

**Inputs:**
- `baseURL: string` - Gameserver URL
- `cookieHeader?: string` - For SSR requests

**Configuration:**
- Default timeout: 30 seconds
- Browser: Uses `credentials: 'include'` for cookies
- SSR: Uses manual cookie header forwarding

#### Auth Methods:

##### `register(name, email, password)`
**Inputs:**
- `name: string`
- `email: string`
- `password: string`

**Outputs:**
```typescript
{
  success: boolean,
  data?: AuthResponse,
  error?: string
}
```

##### `login(email, password)`
**Inputs:**
- `email: string`
- `password: string`

**Outputs:**
```typescript
{
  success: boolean,
  data?: AuthResponse,
  error?: string
}
```

##### `signInAnonymous()`
**Inputs:** None

**Outputs:**
```typescript
{
  success: boolean,
  data?: AuthResponse,
  error?: string
}
```

##### `getMe()`
**Inputs:** None (uses cookies)

**Outputs:**
```typescript
{
  success: boolean,
  data?: UserData,
  error?: string
}
```

**Types:**
```typescript
type UserData = {
  auth: {
    id: string,
    email?: string,
    user_metadata?: { name?: string }
  },
  profile: DbUser,
  isAnonymous: boolean,
  expiresAt?: number
}
```

##### `logout()`
**Inputs:** None

**Outputs:**
```typescript
{
  success: boolean,
  error?: string
}
```

##### `upgradeAccount(name, email, password)`
**Inputs:**
- `name: string`
- `email: string`
- `password: string`

**Outputs:**
```typescript
{
  success: boolean,
  data?: AuthResponse,
  error?: string
}
```

##### `uploadAvatar(avatarBase64)`
**Inputs:**
- `avatarBase64: string` - Base64 encoded image

**Outputs:**
```typescript
{
  success: boolean,
  data?: { message: string, avatarUrl: string },
  error?: string
}
```

##### `resetPassword(email)`
**Inputs:**
- `email: string`

**Outputs:**
```typescript
{
  success: boolean,
  error?: string
}
```

#### Auto-Refresh Feature

The `request()` method automatically handles token refresh:

**Process:**
1. Make request with existing cookies
2. If 401 response and not already retrying:
   - Call `/auth/me` to trigger middleware refresh
   - Retry original request once with new tokens
3. If retry also fails with 401, return auth error

---

### 8. Login Page Component (`apps/frontend/src/routes/+page.svelte`)

User-facing login/signup interface.

#### State Variables:
```typescript
name: string = ''
email: string = ''
password: string = ''
confirmPassword: string = ''
isSignup: boolean = false
isLoading: boolean = false
error: string = ''
showAuth: boolean = false
```

#### Functions:

##### `handlePlayAsGuest()`
**Process:**
1. Call `gameServerAPI.signInAnonymous()`
2. If successful, redirect to `/lobby` or `returnTo`
3. If failed, show error

##### `handleAuth()`
**Validation:**
- Email and password required
- If signup: passwords must match
- If signup: name is required

**Process:**
1. Call `gameServerAPI.register()` or `gameServerAPI.login()`
2. If successful, redirect to `/lobby` or `returnTo`
3. If failed, show error message

##### `toggleAuth()`
**Side Effects:**
- Toggles `showAuth`
- Clears form fields and errors

##### `toggleSignup()`
**Side Effects:**
- Toggles `isSignup`
- Clears confirm password and errors

---

## Data Flow Diagrams

### Anonymous Login Flow

```
User clicks "Play as Guest"
  ↓
Frontend: gameServerAPI.signInAnonymous()
  ↓
POST /gameserver/auth/anonymous
  ↓
SupabaseAuthService.signInAnonymously()
  ├─ Generate unique name (adjective-animal)
  ├─ Check database for conflicts
  ├─ Call Supabase signInAnonymously()
  └─ Return { user, session, isNewUser: true }
  ↓
Middleware: setAuthCookies(res, session)
  ├─ Set sb-access-token cookie
  └─ Set sb-refresh-token cookie
  ↓
Response: { auth, session, isNewUser, isAnonymous: true }
  ↓
Frontend: Redirect to /lobby
  ↓
SvelteKit hooks.server: Fetch /auth/me
  ├─ Middleware: optionalAuth()
  ├─ Extract token from cookies
  ├─ Validate/refresh if needed
  └─ Get or create user profile
  ↓
Set event.locals.user
  ↓
Page loads with user session
```

### Email/Password Registration Flow

```
User fills form and clicks "Create Account"
  ↓
Frontend: gameServerAPI.register(name, email, password)
  ↓
POST /gameserver/auth/register
  ↓
SupabaseAuthService.registerWithPassword()
  └─ Supabase signUp with user_metadata.name
  ↓
Response includes session
  ↓
Middleware: setAuthCookies()
  ↓
Frontend: Redirect to /lobby
```

### Token Refresh Flow

```
User makes authenticated request
  ↓
Frontend: API call with cookies
  ↓
Backend: optionalAuth() middleware
  ├─ Extract sb-access-token
  ├─ Decode JWT
  └─ Token expired?
      ↓ YES
      Extract sb-refresh-token
      ↓
      getOrRefreshSession(refreshToken)
      ├─ Check if refresh already in progress
      ├─ If yes: wait for existing promise
      ├─ If no: call refreshSession()
      └─ Supabase refreshSession()
      ↓
      setAuthCookies(res, newSession)
      ↓
      Continue with refreshed user
```

### SSR Authentication Flow

```
Browser requests page
  ↓
SvelteKit: hooks.server handle()
  ├─ Extract cookie header
  ├─ Check userCache[cookies]
  └─ Cache miss?
      ↓ YES
      Fetch ${GAMESERVER_URL}/auth/me
      ├─ Forward cookie header
      ├─ Gameserver validates/refreshes
      └─ Response with user data
      ↓
      Store in cache
      ↓
      Set event.locals.user
  ↓
+layout.server.ts: Return { user: locals.user }
  ↓
Page component receives user data
```

### Account Upgrade Flow

```
Anonymous user wants permanent account
  ↓
Frontend: gameServerAPI.upgradeAccount(name, email, password)
  ↓
POST /gameserver/auth/upgrade (with auth cookies)
  ↓
Middleware: requireAuth()
  ├─ Validates req.isAnonymous === true
  └─ Returns 401 if not anonymous
  ↓
SupabaseAuthService.upgradeAnonymousUser()
  └─ Supabase updateUser({ email, password, data: { name } })
  ↓
Database: updateUserEmail(profile.id, email)
  ↓
Middleware: setAuthCookies(newSession)
  ↓
Response: { user, session, message }
  ↓
Frontend: User now has permanent account
```

---

## Type Definitions

### SupabaseUser
```typescript
{
  id: string,
  aud: string,
  role: string,
  email?: string,
  email_confirmed_at?: string,
  phone?: string,
  confirmed_at?: string,
  last_sign_in_at?: string,
  app_metadata: any,
  user_metadata: any,
  identities?: any[],
  created_at: string,
  updated_at: string,
  is_anonymous?: boolean
}
```

### DbUser
```typescript
{
  id: string,
  auth_user_id: string,
  name: string,
  email: string | null,
  avatar_url: string | null,
  created_at: string,
  games_played: number,
  games_won: number
}
```

### Session
```typescript
{
  access_token: string,
  refresh_token: string,
  expires_in: number,
  token_type: string
}
```

### UserData (Frontend Type)
```typescript
{
  auth: {
    id: string,
    email?: string,
    user_metadata?: {
      name?: string
    }
  },
  profile: DbUser,
  isAnonymous: boolean,
  expiresAt?: number
}
```

---

## Environment Variables

### Backend (gameserver)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `FRONTEND_URL` - Frontend URL for OAuth redirects
- `NODE_ENV` - Environment (affects cookie security)
- `COOKIE_DOMAIN` - Cookie domain in production

### Frontend
- `GAMESERVER_URL` - Backend gameserver URL (SSR only)

---

## Security Considerations

### Token Storage
- Tokens stored in httpOnly cookies (prevents XSS)
- Secure flag in production (HTTPS only)
- SameSite: lax (CSRF protection)

### Token Validation
- JWT decoded without signature verification in middleware
- Relies on HTTPS and trusted cookie source
- Validates expiration and issuer
- Production should implement full JWT verification

### Refresh Token Deduplication
- In-memory promise cache prevents concurrent refresh token reuse
- Mitigates race conditions from multiple parallel requests

### SSR Cache
- Limited to 1000 entries (prevents memory exhaustion)
- LRU eviction strategy
- Cache key includes full cookie string (prevents cross-user contamination)

### Anonymous Users
- Auto-generated unique names
- Can upgrade to permanent accounts
- Upgrade validates user is anonymous before proceeding
