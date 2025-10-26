
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { GAMESERVER_URL } from '$env/static/private';

export const actions: Actions = {
   default: async ({ request, cookies }) => {
        console.log("logout action called");
        try {
            const response = await fetch(`${GAMESERVER_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Cookie': request.headers.get('cookie') || '',
                },
            });
            
            if (!response.ok) {
                const error = await response.json();
                console.error('Logout error:', error);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Clear cookies on logout
        cookies.delete('sb-access-token', { path: '/' });
        cookies.delete('sb-refresh-token', { path: '/' });

        redirect(303, '/');
    }
}