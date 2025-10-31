# Token Refresh Implementation - Final Approach

## The Problem with Timers

Using `$effect` with `invalidateAll()` creates complexity:
- Risk of infinite loops
- Timer management across navigation
- Harder to debug

## Better Solution: 401 Retry Pattern

**Handle refresh reactively when requests fail** ✅

### How It Works

```typescript
// In gameserver.ts
private async request<T>(endpoint, options, isRetry = false) {
  const response = await fetch(url, { credentials: 'include', ...options });

  // Catch 401 errors
  if (response.status === 401 && !isRetry && endpoint !== '/auth/me') {
    // Trigger refresh by calling /auth/me
    await this.getMe();

    // Retry original request with new cookies
    return this.request<T>(endpoint, options, true);
  }

  return response;
}
```

### Flow Diagram

```
User clicks "Join Room" with expired token (11:05 AM)
  ↓
POST /room/test-room/join (access token expired)
  ↓
Middleware validates token → EXPIRED → 401 response
  ↓
Frontend catches 401 in request interceptor
  ↓
Calls GET /auth/me
  ↓
Middleware sees expired access token
  ↓
Uses refresh token → new access + refresh tokens
  ↓
Sets new cookies in response
  ↓
/auth/me succeeds with new tokens
  ↓
Retry POST /room/test-room/join (with new cookies)
  ↓
Middleware validates new token → VALID ✅
  ↓
User joins room successfully
```

## Why This is Better

### ✅ No Infinite Loops
- No reactive `$effect` watching data
- No `invalidateAll()` triggering re-renders
- Request → Fail → Refresh → Retry → Done

### ✅ No Timer Management
- No `setTimeout` to track
- No cleanup functions
- No "what if user navigates?" edge cases

### ✅ Works Everywhere
- Any API request automatically gets refresh
- WebSocket connections can use same pattern
- Server-side requests handled by middleware

### ✅ Simple to Debug
- Linear flow: request → 401 → refresh → retry
- Console logs show exact sequence
- Easy to trace through network tab

## Frontend Architecture

**Client-side only auth** - no server-side load functions:

```typescript
// In +layout.svelte
onMount(async () => {
  const result = await gameServerAPI.getMe();

  if (result.success && result.data) {
    userStore.updateFromUserData(result.data);
  }
});
```

This approach:
- Runs auth check once on app mount
- Updates user store with profile data
- No SvelteKit load functions needed
- Simpler data flow
- All auth happens through the gameserver API

The `expiresAt` field is returned from `/auth/me` for informational purposes only (showing session expiry to users), but it **doesn't trigger any refresh logic**.

## Edge Cases Handled

### 1. Multiple Concurrent 401s
If 3 requests fail at once:
- All call `getMe()` to refresh
- Middleware deduplicates concurrent refreshes (already implemented)
- All get same new cookies
- All retry with success

### 2. Refresh Token Expired
- `getMe()` fails with 401
- No retry (endpoint === '/auth/me')
- User sees "Not authenticated" error
- Frontend can redirect to login

### 3. Network Errors
- Fetch fails before reaching server
- Catch block returns network error
- No retry (not a 401)
- User sees error message

### 4. Race Conditions
- Tab 1 and Tab 2 both get 401
- Both call `getMe()`
- Middleware uses promise deduplication
- Only one Supabase refresh call
- Both tabs get new cookies

## Summary

| Aspect | Timer Approach ❌ | 401 Retry Approach ✅ |
|--------|------------------|----------------------|
| Complexity | High (effects, timers, cleanup) | Low (just retry on 401) |
| Loop Risk | Possible if not careful | Impossible (linear flow) |
| Navigation | Must handle timer cleanup | Just works |
| Coverage | Only scheduled requests | All requests automatically |
| Debug | Hard (async timers) | Easy (linear trace) |

**Result: Simpler, safer, more reliable.**
