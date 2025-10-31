import { redirect } from '@sveltejs/kit';
import { createGameServerAPI } from '$lib/api/gameserver.server.js';
import type { Room } from '@onlyone/shared';
import type { Actions, PageServerLoad } from './$types';
import { GAMESERVER_URL } from '$env/static/private';

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

export const actions: Actions = {
	kick: async ({ request, params }) => {
		const formData = await request.formData();
		const playerId = formData.get('playerId') as string;
		const roomName = params.roomName;
		
		const response=  await fetch(`${GAMESERVER_URL}/room/${roomName}/kick/${playerId}`, { 
			method: 'POST',
			headers: {
				'Cookie': request.headers.get('cookie') || '',
			}
		});
		console.log(`Kick response status: ${response.status}`);
		if (!response.ok) {
			const errorData = await response.json();
			console.log(`Kick failed: ${errorData.error}`);
			console.log(`Kick failed: ${JSON.stringify(errorData)}`);
			return { success: false, error: errorData.error || 'Failed to kick player' };
		}
		return { success: true };

	}
}

export const prerender = false;
