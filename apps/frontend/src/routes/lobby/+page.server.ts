import { gameServerAPI } from '$lib/api/gameserver.js';

export async function load({ cookies }) {
	// Pre-fetch rooms for instant display
	const roomsResult = await gameServerAPI.getRooms();

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
