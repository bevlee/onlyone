import { redirect } from '@sveltejs/kit';
import { setHeaders } from '$lib/cookie.server';
import type { PageServerLoad, Actions } from './$types';
import { GAMESERVER_URL } from '$env/static/private';

import { fail, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { loginSchema, signupSchema } from '$lib/schema';

export const load: PageServerLoad = async () => {
    return { 
        loginForm: await superValidate(zod4(loginSchema)),
        signupForm: await superValidate(zod4(signupSchema))
    };
};

export const actions: Actions = {
    login: async ({ request, cookies, url }) => {
        const form = await superValidate(request, zod4(loginSchema));
        console.log(form,'login form');
        if (!form.valid) {
            return fail(400, { form });
        }
        const {email, password} = form.data;

        const returnTo = url.searchParams.get('returnTo');

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
                setError(form, 'Invalid credentials', `${error.error}`);
                return fail(400, { form });
            }

            setHeaders(cookies, response.headers.getSetCookie());
        } catch (error) {
            setError(form, 'Invalid credentials', `${error.error}`);
            return fail(400, { form });
        }

        return redirect(303, returnTo || '/lobby');
    },
    signup: async ({ request, url, cookies }) => {
        const form = await superValidate(request, zod4(signupSchema));
        console.log(form,'signup form');
        if (!form.valid) {
            return fail(400, { form });
        }
        const {name, email, password} = form.data;

        const returnTo = url.searchParams.get('returnTo');

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
                console.log(error)
                setError(form, 'Error', `${error.error}`);
                return fail(400, { form });
            }

            setHeaders(cookies, response.headers.getSetCookie());
        } catch (error) {
            console.error('Login error:', error);
            setError(form, 'Error', `${error.error}`);
            return fail(400, { form });
        }

        return redirect(303, returnTo || '/lobby');
    },
    signupAnonymous: async ({ request, url, cookies }) => {
        

        const returnTo = url.searchParams.get('returnTo');

        try {
            const response = await fetch(`${GAMESERVER_URL}/auth/signupAnonymous`, {
                method: 'POST',
            });

             if (!response.ok) {
                return { success: false, error: 'Failed to register' };
            }
            
            // Success - now redirect
            setHeaders(cookies, response.headers.getSetCookie());
        } catch (error) {
            console.log({error}, "no good")
            return { success: false, error: `Connection error ${error.error}` };
        }
        
        return redirect(303,  returnTo || '/lobby');
    }
};
