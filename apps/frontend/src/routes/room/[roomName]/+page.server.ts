import { redirect } from '@sveltejs/kit';
import { createGameServerAPI } from '$lib/api/gameserver.server.js';
import type { Room } from '@onlyone/shared';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, locals, request, url }) => {
	// Server-side auth check - redirect to home with returnTo if not authenticated
	if (!locals.user) {
		// Encode the full path including search params
		console.log('No user, redirecting to home');
		const returnTo = encodeURIComponent(url.pathname + url.search);
		throw redirect(303, `/?returnTo=${returnTo}`);
	}

	// Create API instance with cookies for SSR
	const api = createGameServerAPI(request.headers.get('cookie') || '');

	// Check room access
	const roomStatusResult = await api.checkRoomStatus(params.roomName);

	if (!roomStatusResult.success || !roomStatusResult.data) {
		console.log('Room not found, redirecting to lobby');
		// Room doesn't exist - set toast cookie and redirect
		cookies.set('toast', 'Room not found', {
			path: '/',
			maxAge: 60,
			httpOnly: false
		});
		throw redirect(303, '/lobby');
	}

	const roomStatus = roomStatusResult.data as Partial<Room> & { alreadyJoined?: boolean };

	return {
		roomName: params.roomName,
		alreadyJoined: roomStatus.alreadyJoined || false
	};
}

export const prerender = false;
