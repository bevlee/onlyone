// Room stop game endpoint
import type { RequestHandler } from './$types';

// POST /room/stop - stop the game
export const POST: RequestHandler = async ({ request }) => {
  // Proxy to gameserver /stop endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};