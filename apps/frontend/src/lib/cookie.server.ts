import { type Cookies } from '@sveltejs/kit';

// Helper to set cookies from gameserver response
export const setHeaders = (cookies: Cookies, setCookieHeaders: string[]) => {
    // Forward each cookie to browser
    for (const cookieHeader of setCookieHeaders) {
        // Parse: "sb-access-token=xyz; Max-Age=3600; Path=/; HttpOnly"
        const [cookiePart, ...attributes] = cookieHeader.split(';');
        const [name, value] = cookiePart.split('=');
        // name = "sb-access-token"
        // value = "xyz"

        // Parse attributes
        const maxAgeMatch = attributes.find(attr => 
            attr.trim().toLowerCase().startsWith('max-age')
        );
        const maxAge = maxAgeMatch ? 
            parseInt(maxAgeMatch.split('=')[1]) : 
            undefined;

        // Set cookie in SvelteKit response (goes to browser)
        cookies.set(name.trim(), value.trim(), {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: maxAge
        });
    }
}