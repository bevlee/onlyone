import { redirect } from '@sveltejs/kit';
import { gameServerAPI } from '$lib/api/gameserver.js';

export async function load({ params }) {
	// Check if user is authenticated
	const result = await gameServerAPI.getMe();
	console.log(result)
	if (!result.success || !result.data?.profile?.name) {
		// Not authenticated, redirect to home
		throw redirect(303, '/');
	}

	return {
		roomName: params.roomName
	};
}

// Disable SSR for real-time room page
export const ssr = false;
export const prerender = false;
