// Room start game endpoint
import type { RequestHandler } from './$types';

// POST /room/start - start the game
export const POST: RequestHandler = async ({ request }) => {
  // Proxy to gameserver /start endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};