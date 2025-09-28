// Room status endpoint
import type { RequestHandler } from './$types';

// GET /room/status - get current room status
export const GET: RequestHandler = async () => {
  // Proxy to gameserver /status endpoint
  return new Response(JSON.stringify({ room: null }), {
    headers: { 'content-type': 'application/json' }
  });
};