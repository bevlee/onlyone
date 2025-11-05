// packages/shared/schemas/auth.schemas.ts
import { z } from 'zod';

export const socketAuthSchema = z.object({
  roomName: z.string().min(1, 'roomName required').max(100, 'roomName too long'),
  playerName: z.string().min(1, 'playerName required').max(100, 'playerName too long'),
  playerId: z.string().min(1, 'playerId required'),
});

export type SocketAuth = z.infer<typeof socketAuthSchema>;
