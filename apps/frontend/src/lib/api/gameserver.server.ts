import { env } from '$env/dynamic/private';
import { GameServerAPI } from './gameserver';

const GAMESERVER_URL = env.GAMESERVER_URL || 'http://localhost:3000/gameserver';

/**
 * Creates a GameServerAPI instance configured for server-side requests
 *
 * @param cookieHeader - Optional cookie header string for SSR authentication
 * @returns GameServerAPI instance configured with absolute URL
 */
export function createGameServerAPI(cookieHeader?: string): GameServerAPI {
  return new GameServerAPI(GAMESERVER_URL, cookieHeader);
}
