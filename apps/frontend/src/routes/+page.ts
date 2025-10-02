import { redirect } from '@sveltejs/kit';
import { gameServerAPI } from '$lib/api/gameserver.js';

export async function load() {
	// Check if user is authenticated
	const result = await gameServerAPI.getMe();

	if (result.success && result.data?.profile?.name) {
		// User is authenticated, redirect to lobby
		throw redirect(303, '/lobby');
	}

	// Not authenticated, show login page
	return {};
}

export const ssr = false;
