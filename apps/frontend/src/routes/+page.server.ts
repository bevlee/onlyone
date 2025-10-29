import { redirect } from '@sveltejs/kit';
import { setHeaders } from '$lib/cookie.server';
import type { PageServerLoad, Actions } from './$types';
import { GAMESERVER_URL } from '$env/static/private';


import { fail, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

// add your own schema path here
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
                console.log(error)
                return setError(form, 'email', `Login error. ${error}`);
                
            }


            setHeaders(cookies, response.headers.getSetCookie());} catch (error) {
            console.error('Login error:', error); 
            return setError(form, 'email', 'Login error.');
        }

        return redirect(303, returnTo || '/lobby');
    },
    signup: async ({ request }) => {
        const form = await superValidate(request, zod4(signupSchema));
        console.log(form,'signup form');
        if (!form.valid) {
            return fail(400, { form });
        }
        const {username, email, password} = form.data;
    }
};


// export const actions: Actions = {
//     anonymous: async ({ request, cookies }) => {
//         console.log("anonymous action called");
//         const data = await request.formData();
//         const returnTo = data.get('returnTo')?.toString();

//         try {
//             const response = await fetch(`${GAMESERVER_URL}/auth/anonymous`, {
//                 method: 'POST',
//             });

//             if (!response.ok) {
//                 const error = await response.json();
//                 console.error('Anonymous sign-in error:', error);
//                 return { error: error.error || 'Anonymous sign-in failed' };
//             }

//             setHeaders(cookies, response.headers.getSetCookie());

//         } catch (error) {
//             console.error('Anonymous sign-in error:', error);
//             return { error: 'Network error. Please try again.' };
//         }
//         redirect(303, returnTo || '/lobby');
//     },

//     register: async ({ request, cookies }) => {
//         const form = await superValidate(request, zod4(signupSchema));
//         if (!form.valid) {
//             return fail(400, { ...form, status: "failure" });
//         }
//         const data = await request.formData();
//         const name = data.get('name')?.toString();
//         const email = data.get('email')?.toString();
//         const password = data.get('password')?.toString();
//         const returnTo = data.get('returnTo')?.toString();
//         console.log(data);

//         try {
//             const response = await fetch(`${GAMESERVER_URL}/auth/register`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ name, email, password }),
//             });

//             if (!response.ok) {
//                 const error = await response.json();
//                 console.error('Registration error:', error);
//                 let errorMessage = 'Registration failed';
//                 if (error.error && error.error.includes('already registered')) {
//                     errorMessage = 'Email is already registered. Please log in instead.';
//                 }
//                 return fail(400, { name: name, email: email, signUp: true, status: "failure", error: errorMessage });
//             }
            
//             setHeaders(cookies, response.headers.getSetCookie());

//         } catch (error) {
//             console.error('Registration error:', error);
//             return fail(400, { name: name, email: email, signUp: true, status: "failure", error: 'Network error. Please try again.' });
//         }
//         redirect(303, returnTo || '/lobby');
//     }
// }
