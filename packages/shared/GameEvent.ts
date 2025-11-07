/**
 * Game Events - Union type for all possible game events
 * Encapsulates both client-initiated actions and server broadcasts
 */

import type { ClientEvent, ServerEvent } from './schemas/index.js';

/**
 * All possible game events (client actions + server broadcasts)
 */
export type GameEvent = ClientEvent | ServerEvent;
