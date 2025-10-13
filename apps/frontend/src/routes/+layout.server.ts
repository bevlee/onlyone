import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function
 * Runs on every page load and passes user session to all pages
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
	};
};
