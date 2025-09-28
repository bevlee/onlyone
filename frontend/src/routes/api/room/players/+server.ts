// Room players endpoint
import type { RequestHandler } from './$types';

// GET /room/players - get players in current room
export const GET: RequestHandler = async () => {
  // Proxy to gameserver /players endpoint
  return new Response(JSON.stringify({ players: [] }), {
    headers: { 'content-type': 'application/json' }
  });
};