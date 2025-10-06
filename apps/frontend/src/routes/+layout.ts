import { gameServerAPI } from '$lib/api/gameserver.js';

export async function load() {
	// Check auth state once at root level
	// This will re-run automatically when navigation occurs with invalidateAll: true
	const result = await gameServerAPI.getMe();

	return {
		user: result.success && result.data ? result.data : null
	};
}

// Enable SSR for auth checks
export const ssr = true;
