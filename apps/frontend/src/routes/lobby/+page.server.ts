import { redirect } from '@sveltejs/kit';
import { gameServerAPI } from '$lib/api/gameserver.js';

export async function load({ parent, cookies }) {
	const { user } = await parent();

	if (!user?.profile?.name) {
		// Not authenticated, redirect to home
		throw redirect(303, '/');
	}

	// Pre-fetch rooms for instant display
	const roomsResult = await gameServerAPI.getRooms();

	// Check for toast message in cookie and clear it
	const toastMessage = cookies.get('toast');
	if (toastMessage) {
		cookies.delete('toast', { path: '/' });
	}

	// User is authenticated, allow access to lobby
	return {
		toastMessage,
		initialRooms: roomsResult.success && roomsResult.data ? roomsResult.data.rooms : []
	};
}

export const prerender = false;
