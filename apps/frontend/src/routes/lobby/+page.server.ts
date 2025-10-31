import { redirect } from '@sveltejs/kit';
import { createGameServerAPI } from '$lib/api/gameserver.server.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, request, url }) => {
	// Server-side auth check - redirect to home with returnTo if not authenticated
	if (!locals.user) {
		// Encode the full path including search params
		const returnTo = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/?returnTo=${returnTo}`);
	}

	// Create API instance with cookies for SSR
	const api = createGameServerAPI(request.headers.get('cookie') || '');

	// Pre-fetch rooms for instant display
	const roomsResult = await api.getRooms();

	// Check for toast message in cookie and clear it
	const toastMessage = cookies.get('toast');
	if (toastMessage) {
		cookies.delete('toast', { path: '/' });
	}

	return {
		toastMessage,
		initialRooms: roomsResult.success && roomsResult.data ? roomsResult.data.rooms : []
	};
}

export const prerender = false;
