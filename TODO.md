# TODO

## 🎭 Playwright E2E Testing Implementation

### Phase 1: Setup Infrastructure (Completed ✅)
- [x] **Project Structure Setup**
  - [x] Create `/e2e-tests/` directory in project root
  - [x] Set up `playwright.config.ts` with multi-browser configuration (Chromium, Firefox, Safari)
  - [x] Create `docker-compose.e2e.yml` for isolated test environment
  - [x] Add Playwright dependencies to root `package.json`
  - [x] Create test execution scripts (`test:e2e`, `test:e2e:headed`, `test:e2e:debug`)

- [x] **Environment Configuration**
  - [x] Configure test base URLs and ports
  - [x] Set up test-specific environment variables
  - [x] Create test database/storage isolation
  - [x] Configure parallel test execution settings

### Phase 2: Test Fixtures & Helpers
- [ ] **Core Test Utilities**
  - [ ] Create `fixtures/room-setup.ts` for room creation helpers
  - [ ] Build `fixtures/socket-helpers.ts` for WebSocket testing utilities
  - [ ] Set up `fixtures/user-helpers.ts` for user management
  - [ ] Create `fixtures/cleanup.ts` for test isolation and cleanup

- [ ] **Data Generators**
  - [ ] Implement random username generators
  - [ ] Create unique room name generators
  - [ ] Build test data factories for game states
  - [ ] Set up mock data for different scenarios

### Phase 3: Core Connection Tests
- [ ] **Single User Scenarios** (`tests/connection.spec.ts`)
  - [ ] Test user creates room and joins successfully
  - [ ] Verify room state shows correct player count
  - [ ] Test room persistence across page refreshes
  - [ ] Validate localStorage username persistence

- [ ] **Multi-User Joining** (`tests/multi-user.spec.ts`)
  - [ ] Multiple users join same room simultaneously
  - [ ] Verify all players see each other in lobby
  - [ ] Test concurrent join requests don't cause conflicts
  - [ ] Validate player list synchronization across browsers

- [ ] **Connection State Management**
  - [ ] User disconnects unexpectedly (close tab/browser)
  - [ ] Verify other players see disconnection immediately
  - [ ] Test automatic cleanup of disconnected players
  - [ ] Validate connection status indicators

### Phase 4: Name Management Tests
- [ ] **Valid Name Changes** (`tests/name-management.spec.ts`)
  - [ ] User changes name to valid unique name
  - [ ] All other players see name update in real-time
  - [ ] Name persists in localStorage across sessions
  - [ ] Test name change confirmation feedback

- [ ] **Name Conflict Resolution**
  - [ ] User attempts to change to existing player's name
  - [ ] System rejects change and shows appropriate error
  - [ ] Original name remains unchanged
  - [ ] Test retry mechanism after conflict

- [ ] **Edge Case Name Validation**
  - [ ] Empty names and whitespace-only names
  - [ ] Names too long (>30 characters)
  - [ ] Special characters and unicode/emoji names
  - [ ] SQL injection and XSS attempt prevention

### Phase 5: Advanced Scenarios
- [ ] **Network Recovery Tests** (`tests/recovery.spec.ts`)
  - [ ] Simulate network interruption during active session
  - [ ] Test automatic reconnection and state restoration
  - [ ] Verify room state consistency after recovery
  - [ ] Test connection timeout handling

- [ ] **Server Restart Scenarios**
  - [ ] Restart gameserver during active sessions
  - [ ] Test graceful reconnection of all clients
  - [ ] Verify room state reconstruction
  - [ ] Test data persistence across restarts

- [ ] **Race Condition Tests**
  - [ ] Multiple browsers join/leave rapidly
  - [ ] Verify player lists stay synchronized
  - [ ] Test concurrent name changes
  - [ ] Validate game state consistency under load

### Phase 6: Cross-Browser Compatibility
- [ ] **Browser-Specific Tests**
  - [ ] Test WebSocket connections across browsers
  - [ ] Verify UI consistency (Chrome, Firefox, Safari)
  - [ ] Test mobile browser compatibility
  - [ ] Validate performance across different browsers

- [ ] **Socket.IO Compatibility**
  - [ ] Test WebSocket fallback mechanisms
  - [ ] Verify polling fallback works correctly
  - [ ] Test connection upgrade scenarios
  - [ ] Validate transport negotiation

### Phase 7: Integration & Automation
- [ ] **CI/CD Integration**
  - [ ] Integrate tests into GitHub Actions
  - [ ] Set up test result reporting
  - [ ] Configure failure notifications
  - [ ] Create nightly full test runs

- [ ] **Test Maintenance**
  - [ ] Document test writing guidelines
  - [ ] Create test debugging procedures
  - [ ] Set up test data management
  - [ ] Establish test review process

- [ ] **Performance & Monitoring**
  - [ ] Add test execution time monitoring
  - [ ] Set up test flakiness detection
  - [ ] Create test coverage reporting
  - [ ] Implement test result analytics

## 🔐 Authentication System Implementation

### Core Authentication Features
- [ ] **Session Management**
  - [ ] Implement JWT token generation and validation
  - [ ] Set up secure session cookies
  - [ ] Create token refresh mechanism
  - [ ] Add session expiration handling

- [ ] **API Endpoints**
  - [ ] Create POST /auth/register endpoint
  - [ ] Create POST /auth/login endpoint
  - [ ] Create POST /auth/logout endpoint
  - [ ] Add GET /auth/me endpoint for user info

- [ ] **Input Validation & Security**
  - [ ] Add password strength validation (min length, complexity)
  - [ ] Implement email format validation
  - [ ] Add rate limiting to prevent brute force attacks
  - [ ] Sanitize all user inputs

- [ ] **Password Reset System**
  - [ ] Build "forgot password" functionality
  - [ ] Create secure reset token generation
  - [ ] Add email sending for password resets
  - [ ] Implement reset token validation

- [ ] **Frontend Integration**
  - [ ] Create login/register forms
  - [ ] Add form validation and error handling
  - [ ] Implement authentication state management
  - [ ] Build user profile/settings page

- [ ] **Middleware & Protection**
  - [ ] Add authentication middleware to protect routes
  - [ ] Create user role/permission system if needed
  - [ ] Implement CSRF protection
  - [ ] Add secure headers middleware

## 🎭 Anonymous Authentication + Profile Pictures

### Part 1: Database Schema Updates
- [ ] **Database Schema**
  - [ ] Add `avatar_url: string | null` field to Database interface in `supabase.ts`
  - [ ] Create Supabase Storage bucket called `avatars` (public read access)
  - [ ] Update TypeScript interfaces to include `avatarUrl`

### Part 2: Backend Changes

- [ ] **SupabaseAuthService updates**
  - [ ] Add `signInAnonymously()` method to create anonymous Supabase sessions
  - [ ] Add `upgradeAnonymousUser(email, password)` method to convert anonymous → permanent account
  - [ ] Update existing methods to handle anonymous users (no email)

- [ ] **SupabaseDatabase updates**
  - [ ] Update `createUser()` to accept optional `isAnonymous` flag
  - [ ] Auto-generate guest names for anonymous users: `Guest-${uuid.slice(0, 8)}`
  - [ ] Add `updateUserEmail()` method for account upgrades
  - [ ] Add `uploadAvatar()` and `getAvatarUrl()` methods for profile pictures

- [ ] **Auth Middleware updates**
  - [ ] Update profile creation logic: if user has session but no profile, auto-create one
  - [ ] Add check: `isAnonymous = !user.email`

- [ ] **Server routes**
  - [ ] Add `POST /auth/anonymous` - sign in anonymously
  - [ ] Add `POST /auth/upgrade` - upgrade anonymous → permanent account
  - [ ] Add `POST /auth/avatar` - upload profile picture
  - [ ] Update registration to check if upgrading anonymous user

### Part 3: Frontend Changes

- [ ] **UserStore updates (`user.svelte.ts`)**
  - [ ] Add `isAnonymous: boolean` to UserState
  - [ ] Add `avatarUrl: string | null` to UserProfile
  - [ ] Update `checkAuthState()` to set `isAnonymous = !user.email`
  - [ ] Add `signInAnonymously()` method - called on app init if no session
  - [ ] Add `upgradeAccount(name, email, password)` method
  - [ ] Remove `generateGuestName()` - backend handles it now

- [ ] **API Client updates (`gameserver.ts`)**
  - [ ] Add `signInAnonymous()` endpoint
  - [ ] Add `upgradeAccount()` endpoint
  - [ ] Add `uploadAvatar()` endpoint

- [ ] **App initialization (`+layout.svelte` or app entry)**
  - [ ] On mount: if no session exists, call `userStore.signInAnonymously()`
  - [ ] Ensure all users have Supabase sessions (anonymous or permanent)

### Part 4: Room/Lobby Updates

- [ ] **Lobby page**
  - [ ] Remove `playerName` param from `joinRoom()` - backend gets it from session
  - [ ] Remove `playerName` param from `createRoom()` - backend gets it from session

- [ ] **Room page**
  - [ ] Verify room page works with session-based player identification

- [ ] **Backend lobby routes**
  - [ ] Update `POST /lobby/rooms` - get player from `req.user` and `req.userProfile`
  - [ ] Update `POST /lobby/rooms/:roomName` - get player from session
  - [ ] Remove `playerName` from request body validation

### Part 5: Profile Picture UI (Future Enhancement)
- [ ] Add avatar upload component
- [ ] Display avatars in player list
- [ ] Add avatar to RoomHeader

### Testing Checklist
- [ ] Anonymous user can create/join rooms
- [ ] Anonymous user games are recorded
- [ ] Account upgrade preserves game history
- [ ] Profile pictures upload and display correctly
- [ ] Authenticated users work as before
