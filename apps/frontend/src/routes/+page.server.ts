import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';


export const load: PageServerLoad = async ({ locals, url }) => {
    // Extract returnTo from query params
    const returnTo = url.searchParams.get('returnTo');

    // Server-side auth check - redirect to lobby or returnTo if already authenticated
    if (locals.user) {
        throw redirect(303, returnTo || '/lobby');
    }

    // Pass returnTo to the page so client can use it after auth
    return {
        returnTo: returnTo || null
    };
}