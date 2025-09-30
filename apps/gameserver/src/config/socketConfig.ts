import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Express } from 'express';

export function createSocketServer(app: Express) {
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    connectionStateRecovery: {},
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  return { httpServer, io };
}