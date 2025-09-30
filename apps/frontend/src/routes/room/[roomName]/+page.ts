// Disable SSR for real-time room page
export const ssr = false;
export const prerender = false;

export function load({ params }) {
	return {
		roomName: params.roomName
	};
}
