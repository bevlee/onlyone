import { redirect } from '@sveltejs/kit';
import { gameServerAPI } from '$lib/api/gameserver.js';

export async function load({ params, url }) {
	// Check if user is authenticated
	const authResult = await gameServerAPI.getMe();

	if (!authResult.success || !authResult.data?.profile?.name) {
		// Not authenticated, redirect to home with return URL
		const returnTo = encodeURIComponent(url.pathname);
		throw redirect(303, `/?returnTo=${returnTo}`);
	}

	// Check room access
	const statusResult = await gameServerAPI.checkRoomStatus(params.roomName);

	if (!statusResult.success) {
		// Room doesn't exist
		throw redirect(303, '/lobby?error=Room not found');
	}

	if (statusResult.data && !statusResult.data.canJoin) {
		// Can't join room (full, etc.)
		const reason = statusResult.data.reason || 'Cannot join room';
		throw redirect(303, `/lobby?error=${encodeURIComponent(reason)}`);
	}

	return {
		roomName: params.roomName,
		alreadyJoined: statusResult.data?.alreadyJoined || false
	};
}

// Disable SSR for real-time room page
export const ssr = false;
export const prerender = false;
