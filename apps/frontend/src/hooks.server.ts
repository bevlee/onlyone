import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

// Use absolute URL for server-side requests
const GAMESERVER_URL = env.GAMESERVER_URL || 'http://localhost:3000/gameserver';

/**
 * Server-side auth hook - runs on every request
 * Fetches user session from gameserver and attaches to event.locals
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Get cookies from the request
	const cookies = event.request.headers.get('cookie') || '';

	try {
		// Call gameserver /auth/me endpoint to check session
		const response = await fetch(`${GAMESERVER_URL}/auth/me`, {
			headers: {
				cookie: cookies,
			},
		});

		if (response.ok) {
			const userData = await response.json() as App.Locals['user'];
			event.locals.user = userData;
		} else {
			event.locals.user = null;
		}
	} catch (error) {
		console.error('[hooks.server] Failed to fetch user session:', error);
		event.locals.user = null;
	}

	// Continue processing the request
	return resolve(event);
};
