import { redirect } from '@sveltejs/kit';

export async function load({ parent }) {
	const { user } = await parent();

	if (user?.profile?.name) {
		// User is authenticated, redirect to lobby
		throw redirect(303, '/lobby');
	}

	// Not authenticated, show login page
	return {};
}
