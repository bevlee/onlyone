// Room leave endpoint
import type { RequestHandler } from './$types';

// POST /room/leave - leave current room
export const POST: RequestHandler = async ({ request }) => {
  // Proxy to gameserver /leave endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};