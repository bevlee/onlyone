// Room invite endpoint
import type { RequestHandler } from './$types';

// POST /room/invite - invite a player to room
export const POST: RequestHandler = async ({ request }) => {
  // Proxy to gameserver /invite endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};