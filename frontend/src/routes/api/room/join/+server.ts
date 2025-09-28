// Room join endpoint
import type { RequestHandler } from './$types';

// POST /room/join - join a room
export const POST: RequestHandler = async ({ request }) => {
  // Proxy to gameserver /join endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};