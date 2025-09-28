// Room kick player endpoint
import type { RequestHandler } from './$types';

// POST /room/kick/[playerId] - kick a player from room
export const POST: RequestHandler = async ({ params, request }) => {
  // Proxy to gameserver /kick/:playerId endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};