import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@onlyone/shared';

export function createSocketServer(app: Express) {
  const httpServer = createServer(app);

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >(httpServer, {
    path: '/gameserver/socket.io',
    connectionStateRecovery: {},
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  return { httpServer, io };
}