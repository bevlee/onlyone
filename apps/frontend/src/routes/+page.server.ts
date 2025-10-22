import { redirect } from '@sveltejs/kit';
import { setHeaders } from '$lib/cookie.server';
import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';

// Use absolute URL for server-side requests
const GAMESERVER_URL = env.GAMESERVER_URL || 'http://localhost:3000/gameserver';

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


export const actions: Actions = {
    anonymous: async ({ request, cookies }) => {
        console.log("anonymous action called");
        const data = await request.formData();
        const returnTo = data.get('returnTo')?.toString();

        try {
            const response = await fetch(`${GAMESERVER_URL}/auth/anonymous`, {
                method: 'POST',
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Anonymous sign-in error:', error);
                return { error: error.error || 'Anonymous sign-in failed' };
            }

            setHeaders(cookies, response.headers.getSetCookie());

            // Note: Cookies are set by gameserver, but we can't forward them here
            // The hook will pick them up on the next page load
            return redirect(303, returnTo || '/lobby');
        } catch (error) {
            console.error('Anonymous sign-in error:', error);
            return { error: 'Network error. Please try again.' };
        }
    },

    login: async ({ request, cookies }) => {
        const data = await request.formData();
        const email = data.get('email')?.toString();
        const password = data.get('password')?.toString();
        const returnTo = data.get('returnTo')?.toString();

        if (!email || !password) {
            return { error: 'Email and password are required' };
        }

        try {
            const response = await fetch(`${GAMESERVER_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Login error:', error);
                return { error: error.error || 'Login failed' };
            }


            setHeaders(cookies, response.headers.getSetCookie());
            // Cookies are set by gameserver, hook will pick them up
            return redirect(303, returnTo || '/lobby');
        } catch (error) {
            console.error('Login error:', error);
            return { error: 'Network error. Please try again.' };
        }
    },

    register: async ({ request, cookies }) => {
        const data = await request.formData();
        const name = data.get('name')?.toString();
        const email = data.get('email')?.toString();
        const password = data.get('password')?.toString();
        const returnTo = data.get('returnTo')?.toString();

        if (!name || !email || !password) {
            return { error: 'Name, email, and password are required' };
        }

        try {
            const response = await fetch(`${GAMESERVER_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Registration error:', error);
                return { error: error.error || 'Registration failed' };
            }
            
            setHeaders(cookies, response.headers.getSetCookie());

            // Cookies are set by gameserver, hook will pick them up
            return redirect(303, returnTo || '/lobby');
        } catch (error) {
            console.error('Registration error:', error);
            return { error: 'Network error. Please try again.' };
        }
    }
}