# OnlyOne Authentication System - Visual Diagrams

This document contains visual diagrams showing the inputs, outputs, and data flow of the authentication system.

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Browser Client"
        UI[Login Page<br/>+page.svelte]
        API[GameServerAPI<br/>Client]
    end

    subgraph "SvelteKit Frontend Server"
        Hooks[hooks.server.ts<br/>Auth Hook]
        Layout[+layout.server.ts]
        Cache[(User Cache<br/>LRU 1000)]
    end

    subgraph "Express Backend (Gameserver)"
        Routes[Auth Routes<br/>/auth/*]
        Middleware[Auth Middleware<br/>optionalAuth/requireAuth]
        AuthService[SupabaseAuthService]
        DBService[SupabaseDatabase]
    end

    subgraph "External Services"
        Supabase[(Supabase Auth<br/>+ Database)]
        Storage[(Supabase<br/>Storage)]
    end

    UI -->|HTTP + Cookies| API
    API -->|REST API| Routes
    Routes --> Middleware
    Middleware --> AuthService
    Middleware --> DBService
    AuthService -->|JWT Operations| Supabase
    DBService -->|User Profiles| Supabase
    DBService -->|Avatars| Storage

    Hooks -->|Fetch /auth/me| Routes
    Hooks --> Cache
    Hooks -->|Set locals.user| Layout
    Layout -->|Pass user data| UI

    Routes -->|Set Cookies| API
```

---

## Authentication Flow - Complete Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Login Page
    participant API as GameServerAPI
    participant Routes as Auth Routes
    participant Middleware
    participant AuthSvc as SupabaseAuthService
    participant DB as SupabaseDatabase
    participant Supabase

    Note over User,Supabase: Anonymous Login Flow

    User->>UI: Click "Play as Guest"
    UI->>API: signInAnonymous()
    API->>Routes: POST /auth/anonymous
    Routes->>AuthSvc: signInAnonymously()
    AuthSvc->>AuthSvc: Generate unique name
    AuthSvc->>DB: Check name conflicts
    DB-->>AuthSvc: Name available
    AuthSvc->>Supabase: signInAnonymously()
    Supabase-->>AuthSvc: {user, session}
    AuthSvc-->>Routes: {user, session, isNewUser}
    Routes->>Routes: setAuthCookies(session)
    Routes-->>API: {auth, session, isAnonymous: true}
    API-->>UI: {success: true, data}
    UI->>UI: Redirect to /lobby

    Note over User,Supabase: SSR Page Load

    User->>UI: Navigate to page
    UI->>Routes: GET /auth/me (via hooks)
    Routes->>Middleware: optionalAuth()
    Middleware->>Middleware: Extract cookies
    Middleware->>AuthSvc: getUserFromToken(token)
    AuthSvc-->>Middleware: SupabaseUser
    Middleware->>DB: getUserByAuthId(user.id)
    DB-->>Middleware: DbUser profile
    Middleware-->>Routes: req.user + req.userProfile
    Routes-->>UI: {auth, profile, isAnonymous}
    UI->>User: Render page with user
```

---

## Input/Output Diagram by Component

```mermaid
graph LR
    subgraph "SupabaseAuthService Methods"
        direction TB

        R1[registerWithPassword]
        R1_IN["INPUT:<br/>name: string<br/>email: string<br/>password: string"]
        R1_OUT["OUTPUT:<br/>{user, session, isNewUser}"]
        R1_IN --> R1 --> R1_OUT

        L1[loginWithPassword]
        L1_IN["INPUT:<br/>email: string<br/>password: string"]
        L1_OUT["OUTPUT:<br/>{user, session, isNewUser}"]
        L1_IN --> L1 --> L1_OUT

        A1[signInAnonymously]
        A1_IN["INPUT:<br/>(none)"]
        A1_OUT["OUTPUT:<br/>{user, session, isNewUser}"]
        A1_IN --> A1 --> A1_OUT

        T1[getUserFromToken]
        T1_IN["INPUT:<br/>token: string"]
        T1_OUT["OUTPUT:<br/>SupabaseUser | null"]
        T1_IN --> T1 --> T1_OUT

        RF1[refreshSession]
        RF1_IN["INPUT:<br/>refreshToken: string"]
        RF1_OUT["OUTPUT:<br/>{session, user} | null"]
        RF1_IN --> RF1 --> RF1_OUT

        U1[upgradeAnonymousUser]
        U1_IN["INPUT:<br/>name: string<br/>email: string<br/>password: string"]
        U1_OUT["OUTPUT:<br/>{user, session, isNewUser}"]
        U1_IN --> U1 --> U1_OUT
    end
```

---

## Middleware Flow Diagram

```mermaid
flowchart TD
    Start[Request Arrives] --> Extract[Extract sb-access-token<br/>from cookies]
    Extract --> HasToken{Has Token?}

    HasToken -->|Yes| Decode[getUserFromToken<br/>Decode JWT]
    HasToken -->|No| CheckRefresh[Check sb-refresh-token]

    Decode --> Valid{Valid &<br/>Not Expired?}
    Valid -->|Yes| GetProfile[Get User Profile<br/>from Database]
    Valid -->|No| CheckRefresh

    CheckRefresh --> HasRefresh{Has Refresh<br/>Token?}
    HasRefresh -->|Yes| Refresh[getOrRefreshSession<br/>Call Supabase]
    HasRefresh -->|No| NoAuth[No Authentication]

    Refresh --> RefreshSuccess{Success?}
    RefreshSuccess -->|Yes| SetCookies[setAuthCookies<br/>Update tokens]
    RefreshSuccess -->|No| NoAuth

    SetCookies --> GetProfile

    GetProfile --> ProfileExists{Profile<br/>Exists?}
    ProfileExists -->|Yes| AttachUser[Attach to req:<br/>req.user<br/>req.userProfile<br/>req.isAnonymous]
    ProfileExists -->|No| CreateProfile[Auto-create<br/>User Profile]

    CreateProfile --> AttachUser

    AttachUser --> Optional{Middleware<br/>Type?}
    NoAuth --> Optional

    Optional -->|optionalAuth| Continue[Continue to<br/>Next Handler]
    Optional -->|requireAuth + No User| Return401[Return 401<br/>Unauthorized]
    Optional -->|requireAuth + Has User| Continue

    Continue --> End[Request Processed]
    Return401 --> End

    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style Return401 fill:#ffe1e1
    style AttachUser fill:#e1ffe1
    style SetCookies fill:#fff4e1
```

---

## API Endpoints Input/Output Map

```mermaid
graph TD
    subgraph "Auth Endpoints"
        E1["POST /auth/register"]
        E1_IN["INPUT:<br/>{name, email, password}"]
        E1_OUT["OUTPUT:<br/>{user, session, isNewUser}<br/>+ Set Cookies"]
        E1_IN --> E1 --> E1_OUT

        E2["POST /auth/login"]
        E2_IN["INPUT:<br/>{email, password}"]
        E2_OUT["OUTPUT:<br/>{user, session, isNewUser}<br/>+ Set Cookies"]
        E2_IN --> E2 --> E2_OUT

        E3["POST /auth/anonymous"]
        E3_IN["INPUT:<br/>{}"]
        E3_OUT["OUTPUT:<br/>{auth, session,<br/>isAnonymous: true}<br/>+ Set Cookies"]
        E3_IN --> E3 --> E3_OUT

        E4["POST /auth/upgrade<br/>(requires auth)"]
        E4_IN["INPUT:<br/>{name, email, password}<br/>+ Auth Cookies"]
        E4_OUT["OUTPUT:<br/>{user, session, message}<br/>+ Set New Cookies"]
        E4_IN --> E4 --> E4_OUT

        E5["GET /auth/me<br/>(optional auth)"]
        E5_IN["INPUT:<br/>Cookies"]
        E5_OUT["OUTPUT:<br/>{auth, profile,<br/>isAnonymous, expiresAt}"]
        E5_IN --> E5 --> E5_OUT

        E6["POST /auth/logout<br/>(requires auth)"]
        E6_IN["INPUT:<br/>Auth Cookies"]
        E6_OUT["OUTPUT:<br/>{message}<br/>+ Clear Cookies"]
        E6_IN --> E6 --> E6_OUT

        E7["POST /auth/avatar<br/>(requires auth)"]
        E7_IN["INPUT:<br/>{avatar: base64}<br/>+ Auth Cookies"]
        E7_OUT["OUTPUT:<br/>{message, avatarUrl}"]
        E7_IN --> E7 --> E7_OUT

        E8["POST /auth/reset-password"]
        E8_IN["INPUT:<br/>{email}"]
        E8_OUT["OUTPUT:<br/>{message}<br/>+ Send Email"]
        E8_IN --> E8 --> E8_OUT
    end

    style E1_OUT fill:#e1ffe1
    style E2_OUT fill:#e1ffe1
    style E3_OUT fill:#e1ffe1
    style E4_OUT fill:#e1ffe1
    style E5_OUT fill:#e1ffe1
    style E6_OUT fill:#ffe1e1
    style E7_OUT fill:#e1ffe1
    style E8_OUT fill:#fff4e1
```

---

## Token Refresh Flow Detail

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant Cache as Promise Cache
    participant AuthSvc as AuthService
    participant Supabase

    Client->>Middleware: Request with expired token
    Middleware->>Middleware: Extract sb-refresh-token
    Middleware->>Cache: Check if refresh in progress?

    alt Refresh already in progress
        Cache-->>Middleware: Return existing promise
        Middleware->>Middleware: Wait for promise
        Cache-->>Middleware: {session, user}
    else No refresh in progress
        Middleware->>Cache: Store new promise
        Middleware->>AuthSvc: refreshSession(refreshToken)
        AuthSvc->>Supabase: POST /auth/v1/token?grant_type=refresh_token
        Supabase-->>AuthSvc: {access_token, refresh_token, user}
        AuthSvc-->>Middleware: {session, user}
        Middleware->>Cache: Delete promise (cleanup)
    end

    Middleware->>Middleware: setAuthCookies(response, session)
    Middleware->>Client: Response with new cookies

    Note over Cache: Prevents concurrent<br/>refresh token reuse
```

---

## SSR Cache Strategy

```mermaid
flowchart LR
    Request[Browser Request] --> Hook[hooks.server.ts]
    Hook --> ExtractCookie[Extract Cookie Header]
    ExtractCookie --> CacheCheck{Cookie in<br/>Cache?}

    CacheCheck -->|Hit| CacheReturn[Return Cached<br/>User Data]
    CacheCheck -->|Miss| FetchAPI[Fetch /auth/me<br/>with cookies]

    FetchAPI --> APIResponse{Response<br/>OK?}
    APIResponse -->|Yes| StoreCache[Store in Cache]
    APIResponse -->|No| StoreNull[Store null in Cache]

    StoreCache --> CheckSize{Cache Size<br/>> 1000?}
    StoreNull --> CheckSize

    CheckSize -->|Yes| Evict[Evict Oldest Entry<br/>LRU Strategy]
    CheckSize -->|No| SetLocals[Set event.locals.user]

    Evict --> SetLocals
    CacheReturn --> SetLocals

    SetLocals --> PageLoad[Page Load Function]
    PageLoad --> Client[Return to Client]

    style CacheReturn fill:#e1ffe1
    style StoreCache fill:#fff4e1
    style Evict fill:#ffe1e1
```

---

## Data Type Relationships

```mermaid
classDiagram
    class SupabaseUser {
        +string id
        +string aud
        +string role
        +string? email
        +string? email_confirmed_at
        +any app_metadata
        +any user_metadata
        +boolean? is_anonymous
        +string created_at
        +string updated_at
    }

    class Session {
        +string access_token
        +string refresh_token
        +number expires_in
        +string token_type
    }

    class DbUser {
        +string id
        +string auth_user_id
        +string name
        +string? email
        +string? avatar_url
        +number games_played
        +number games_won
        +string created_at
    }

    class AuthResult {
        +SupabaseUser user
        +Session session
        +boolean isNewUser
    }

    class UserData {
        +AuthUser auth
        +DbUser profile
        +boolean isAnonymous
        +number? expiresAt
    }

    class AuthUser {
        +string id
        +string? email
        +UserMetadata? user_metadata
    }

    class UserMetadata {
        +string? name
    }

    class ExpressRequest {
        +SupabaseUser? user
        +DbUser? userProfile
        +boolean? isAnonymous
    }

    AuthResult --> SupabaseUser
    AuthResult --> Session
    UserData --> AuthUser
    UserData --> DbUser
    AuthUser --> UserMetadata
    ExpressRequest --> SupabaseUser
    ExpressRequest --> DbUser
    DbUser --> SupabaseUser : references via auth_user_id
```

---

## Cookie Flow Diagram

```mermaid
flowchart TD
    subgraph "Authentication Success"
        Auth[User Authenticates] --> SetCookies[setAuthCookies]
        SetCookies --> Access[Set sb-access-token<br/>httpOnly, secure, sameSite: lax<br/>expires: session.expires_in]
        SetCookies --> Refresh[Set sb-refresh-token<br/>httpOnly, secure, sameSite: lax<br/>maxAge: 7 days]
    end

    subgraph "Subsequent Requests"
        Request[Browser Request] --> SendCookies[Browser Auto-sends<br/>Cookies]
        SendCookies --> Middleware[Auth Middleware]
        Middleware --> ValidateAccess[Validate Access Token]
        ValidateAccess --> Expired{Expired?}
        Expired -->|Yes| UseRefresh[Use Refresh Token]
        Expired -->|No| Authenticated[Continue Authenticated]
        UseRefresh --> NewTokens[Get New Tokens<br/>from Supabase]
        NewTokens --> UpdateCookies[Update Both Cookies]
        UpdateCookies --> Authenticated
    end

    subgraph "Logout"
        LogoutReq[Logout Request] --> ClearCookies[clearAuthCookies]
        ClearCookies --> RemoveAccess[Clear sb-access-token]
        ClearCookies --> RemoveRefresh[Clear sb-refresh-token]
        RemoveAccess --> Unauthenticated[User Logged Out]
        RemoveRefresh --> Unauthenticated
    end

    style Access fill:#e1ffe1
    style Refresh fill:#e1ffe1
    style Authenticated fill:#e1ffe1
    style UpdateCookies fill:#fff4e1
    style Unauthenticated fill:#ffe1e1
```

---

## Frontend Client Auto-Retry Logic

```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant API as GameServerAPI
    participant Backend as Auth Routes
    participant Middleware

    UI->>API: Call API method
    API->>Backend: Request with cookies
    Backend->>Middleware: Validate auth
    Middleware-->>Backend: 401 Unauthorized
    Backend-->>API: 401 Response

    Note over API: Not a retry yet,<br/>not /auth/me endpoint

    API->>API: Check: isRetry? No
    API->>Backend: GET /auth/me<br/>(trigger refresh)
    Backend->>Middleware: optionalAuth()
    Middleware->>Middleware: Refresh tokens
    Middleware-->>Backend: New session
    Backend->>Backend: Set new cookies
    Backend-->>API: 200 OK {user data}

    Note over API: Refresh successful,<br/>retry original request

    API->>Backend: Original request (retry)<br/>with new cookies
    Backend->>Middleware: Validate auth
    Middleware-->>Backend: Authenticated
    Backend-->>API: 200 OK {data}
    API-->>UI: {success: true, data}

    Note over API: Max 1 retry per request
```

---

## Account Upgrade Flow Detailed

```mermaid
graph TD
    Start[Anonymous User] --> UI[Click Upgrade Account]
    UI --> Form[Fill Form:<br/>name, email, password]
    Form --> Submit[Submit Form]
    Submit --> API[gameServerAPI.upgradeAccount]
    API --> Route[POST /auth/upgrade<br/>with cookies]
    Route --> MW[requireAuth Middleware]

    MW --> CheckAuth{Authenticated?}
    CheckAuth -->|No| Return401[401 Unauthorized]
    CheckAuth -->|Yes| CheckAnon{Is Anonymous?}

    CheckAnon -->|No| Return400[400 Bad Request:<br/>Only anonymous users<br/>can upgrade]
    CheckAnon -->|Yes| UpgradeAuth[SupabaseAuthService<br/>upgradeAnonymousUser]

    UpgradeAuth --> UpdateSupabase[Supabase updateUser:<br/>Set email, password,<br/>user_metadata.name]
    UpdateSupabase --> GetSession[Get new session]
    GetSession --> UpdateDB[Database:<br/>updateUserEmail]
    UpdateDB --> SetCookies[setAuthCookies<br/>with new session]
    SetCookies --> Success[200 OK:<br/>{user, session, message}]
    Success --> Redirect[Frontend:<br/>User now permanent]

    Return401 --> Error[Show Error]
    Return400 --> Error

    style Start fill:#e1f5ff
    style Success fill:#e1ffe1
    style Redirect fill:#e1ffe1
    style Return401 fill:#ffe1e1
    style Return400 fill:#ffe1e1
    style Error fill:#ffe1e1
```

---

## Security Layers Diagram

```mermaid
graph TB
    subgraph "Security Layers"
        direction TB

        L1[Layer 1: HTTPS Transport]
        L2[Layer 2: httpOnly Cookies<br/>XSS Protection]
        L3[Layer 3: Secure & SameSite Flags<br/>CSRF Protection]
        L4[Layer 4: JWT Expiration<br/>Time-based Security]
        L5[Layer 5: Token Refresh<br/>Short-lived Access Tokens]
        L6[Layer 6: Issuer Validation<br/>Token Source Verification]
        L7[Layer 7: Refresh Deduplication<br/>Race Condition Prevention]
        L8[Layer 8: SSR Cache LRU<br/>Memory Protection]

        L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7 --> L8
    end

    subgraph "Attack Vectors Mitigated"
        A1[XSS: Cannot access cookies via JavaScript]
        A2[CSRF: SameSite + httpOnly]
        A3[Token Theft: Short expiration]
        A4[Token Reuse: Refresh deduplication]
        A5[Memory DoS: LRU cache limit]
        A6[Spoofing: Issuer validation]
    end

    L2 -.->|Prevents| A1
    L3 -.->|Prevents| A2
    L4 -.->|Mitigates| A3
    L7 -.->|Prevents| A4
    L8 -.->|Prevents| A5
    L6 -.->|Prevents| A6

    style L1 fill:#e1f5ff
    style L2 fill:#e1ffe1
    style L3 fill:#e1ffe1
    style L4 fill:#fff4e1
    style L5 fill:#fff4e1
    style L6 fill:#fff4e1
    style L7 fill:#fff4e1
    style L8 fill:#fff4e1
    style A1 fill:#ffe1e1
    style A2 fill:#ffe1e1
    style A3 fill:#ffe1e1
    style A4 fill:#ffe1e1
    style A5 fill:#ffe1e1
    style A6 fill:#ffe1e1
```

---

## Complete User Journey Map

```mermaid
journey
    title User Authentication Journey
    section Anonymous User
      Visit site: 5: User
      Click "Play as Guest": 5: User
      System generates name: 3: System
      Create anonymous session: 3: System
      Redirect to lobby: 5: User
      Play game: 5: User
    section Upgrade to Permanent
      Click upgrade account: 4: User
      Fill registration form: 4: User
      Submit credentials: 4: User
      System updates auth: 3: System
      System updates database: 3: System
      Receive confirmation: 5: User
      Continue as registered: 5: User
    section Return Visit
      Visit site: 5: User
      Auto-authenticate via cookies: 5: System
      Token expired - refresh: 3: System
      Load user profile: 4: System
      Continue to lobby: 5: User
    section Logout
      Click logout: 4: User
      Clear session: 3: System
      Clear cookies: 3: System
      Redirect to login: 4: User
```

---

## Environment Variables Flow

```mermaid
graph LR
    subgraph "Backend Environment"
        E1[SUPABASE_URL] --> AuthSvc[SupabaseAuthService]
        E2[SUPABASE_ANON_KEY] --> AuthSvc
        E3[SUPABASE_SERVICE_ROLE_KEY] --> DBSvc[SupabaseDatabase]
        E4[FRONTEND_URL] --> AuthSvc
        E5[NODE_ENV] --> MW[Middleware<br/>Cookie Security]
        E6[COOKIE_DOMAIN] --> MW
    end

    subgraph "Frontend Environment"
        E7[GAMESERVER_URL] --> SSR[SSR Hooks<br/>hooks.server.ts]
    end

    subgraph "Runtime Behavior"
        AuthSvc --> |Validates issuer| JWT[JWT Validation]
        AuthSvc --> |OAuth redirects| OAuth[OAuth Flow]
        MW --> |secure flag| Cookies[Cookie Settings]
        MW --> |domain| Cookies
        SSR --> |Fetch| Backend[Backend API]
    end

    style E1 fill:#e1f5ff
    style E2 fill:#e1f5ff
    style E3 fill:#e1f5ff
    style E4 fill:#e1f5ff
    style E5 fill:#fff4e1
    style E6 fill:#fff4e1
    style E7 fill:#e1ffe1
```

---

## Notes

### Diagram Legend

- **Blue boxes**: Entry points / Initial state
- **Green boxes**: Successful outcomes
- **Yellow boxes**: Processing / Intermediate state
- **Red boxes**: Errors / Failure states
- **Solid arrows**: Data flow
- **Dashed arrows**: Relationships / Prevents

### How to View These Diagrams

These diagrams use Mermaid syntax and can be viewed in:

1. **GitHub** - Renders automatically in markdown files
2. **VS Code** - Install "Markdown Preview Mermaid Support" extension
3. **Mermaid Live Editor** - Copy/paste at https://mermaid.live
4. **Documentation sites** - Most modern doc platforms support Mermaid

### Key Insights from Diagrams

1. **Token Flow**: Access tokens are short-lived, refresh tokens last 7 days
2. **Automatic Refresh**: Both middleware and frontend client auto-refresh expired tokens
3. **Cache Strategy**: SSR uses LRU cache to reduce backend calls
4. **Security Layers**: Multiple overlapping security mechanisms
5. **Anonymous Flow**: Unique name generation with conflict detection
6. **Upgrade Path**: Anonymous users can convert to permanent accounts
7. **Auto-Retry**: Frontend automatically retries failed requests after token refresh
