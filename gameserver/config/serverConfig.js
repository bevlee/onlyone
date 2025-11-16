import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { logger } from './logger.js';

/**
 * Server configuration module
 * Separates Express and Socket.IO setup from business logic
 */


// account for port 80 being omitted as default
const CLIENT_PORT = process.env.CLIENT_PORT || "5173";
const SERVER_NAME = process.env.SERVER_NAME || "localhost";

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
export const createExpressServer = () => {
  const app = express();
  app.use(cors());
  return app;
};

/**
 * Create and configure Socket.IO server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Configured Socket.IO server
 */
export const createSocketServer = (server) => {
  const clientOrigin = CLIENT_PORT === "80" ? `http://${SERVER_NAME}` : `http://${SERVER_NAME}:${CLIENT_PORT}`;
  const allowedOrigins = [clientOrigin]

  return new Server(server, {
    connectionStateRecovery: {}, // Enable connection state recovery
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });
};

/**
 * Start the HTTP server on specified port
 * @param {http.Server} server - HTTP server instance
 * @param {number} port - Port number (default: 3000)
 */
export const startServer = (server, port = 3000) => {
  server.listen(port, () => {
    logger.info({ port }, `Server running at http://localhost:${port}`);
  });
};