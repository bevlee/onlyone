/**
 * Game Events - Union type for all possible game events
 * Encapsulates both client-initiated actions and server broadcasts
 */

import type { ClientEvent } from './schemas/index.js';
import type { ServerEvent } from './ServerEvents.js';

/**
 * All possible game events (client actions + server broadcasts)
 */
export type GameEvent = ClientEvent | ServerEvent;
