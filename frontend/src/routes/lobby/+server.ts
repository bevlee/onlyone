// Lobby server-side endpoints
import type { RequestHandler } from './$types';

// GET /lobby - fetch active rooms
export const GET: RequestHandler = async () => {
  // Proxy to gameserver /rooms endpoint
  return new Response(JSON.stringify({ rooms: [] }), {
    headers: { 'content-type': 'application/json' }
  });
};

// POST /lobby - join a room
export const POST: RequestHandler = async ({ request }) => {
  // Proxy to gameserver /rooms/:roomId endpoint
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'content-type': 'application/json' }
  });
};