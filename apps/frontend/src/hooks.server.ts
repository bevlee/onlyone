import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

import { setHeaders } from '$lib/cookie.server';
// Use absolute URL for server-side requests
const GAMESERVER_URL = env.GAMESERVER_URL || 'http://localhost:3000/gameserver';

// Key: cookie string, Value: userData
export const userCache = new Map<string, App.Locals['user']>();
const MAX_CACHE_SIZE = 1000; 

/**
 * Server-side auth hook - runs on every request
 * Fetches user session from gameserver and attaches to event.locals
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Skip auth check for static assets and internal routes
	const url = new URL(event.request.url);
	if (
		url.pathname.startsWith('/_app/') ||
		url.pathname.startsWith('/node_modules/') ||
		event.request.headers.get('sec-fetch-dest') === 'image' ||
		event.request.headers.get('sec-fetch-dest') === 'font' ||
		event.request.headers.get('sec-fetch-dest') === 'script' ||
		event.request.headers.get('sec-fetch-dest') === 'style'
	) {
		return resolve(event);
	}

	const requestCookies = event.request.headers.get('cookie') || '';

	const cached = userCache.get(requestCookies);
	if (cached !== undefined) {
		event.locals.user = cached;
	} else {
		// Cache miss - fetch from gameserver
		try {
			// Call gameserver /auth/me endpoint to check session (handles refresh)
			const response = await fetch(`${GAMESERVER_URL}/auth/me`, {
				headers: {
					cookie: requestCookies,
				},
			});

			if (response.ok) {
				const userData = await response.json() as App.Locals['user'];
				event.locals.user = userData;

				userCache.set(requestCookies, userData);

            	setHeaders(event.cookies, response.headers.getSetCookie());

				// Prevent memory leaks - clean up old entries
				if (userCache.size > MAX_CACHE_SIZE) {
					// Remove oldest entry (first in map)
					const firstKey = userCache.keys().next().value;
					if (firstKey) userCache.delete(firstKey);
				}
			} else {
				event.locals.user = null;
				userCache.set(requestCookies, null);
			}
		} catch (error) {
			console.error('[hooks.server] Failed to fetch user session:', error);
			event.locals.user = null;
		}
	}

	return resolve(event);
};
