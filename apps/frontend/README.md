# OnlyOne Frontend

SvelteKit frontend for the OnlyOne multiplayer word-guessing game.

## Tech Stack

- SvelteKit with SSR (Server-Side Rendering)
- TypeScript
- Socket.IO client for real-time game communication
- Svelte stores for client-side state management

## Authentication

The frontend uses **server-side rendering** to handle authentication - no client-side auth logic exists.

### SSR Authentication Hook

Authentication is delegated to the gameserver via [hooks.server.ts](src/hooks.server.ts):

**How it works:**

1. SvelteKit `handle` hook runs on every page request
2. Hook forwards request cookies to gameserver's `/auth/me` endpoint
3. Gameserver validates auth tokens and returns user data
4. User data attached to `event.locals.user` for server-side access
5. Session cache prevents redundant auth checks

**Benefits:**

- **Zero client-side auth code**: Frontend never touches auth tokens
- **HttpOnly cookie security**: Tokens inaccessible to JavaScript
- **Automatic token refresh**: Gameserver handles refresh transparently
- **SSR-ready**: User data available during server-side rendering
- **Performance**: In-memory cache reduces auth overhead

### User Session Access

**Server-side (in `+page.server.ts` or `+layout.server.ts`):**

```typescript
export const load = async ({ locals }) => {
	const user = locals.user; // Available from auth hook
	return { user };
};
```

**Client-side (in Svelte components):**

```typescript
// User data passed from server load function
export let data;
const user = data.user;
```

### Authentication State

- User session persists via httpOnly cookies set by gameserver
- No client-side token storage or management
- Frontend receives user data as props from server load functions
