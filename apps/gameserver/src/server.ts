import { config } from 'dotenv';

// Load environment variables FIRST before any other imports
// Load root .env first, then local .env (which overrides)
config({ path: '../../.env' });
config({ path: '.env', override: true });

import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { logger } from './config/logger.js';
import { SupabaseAuthService } from './services/SupabaseAuthService.js';
import { SupabaseDatabase } from './services/SupabaseDatabase.js';
import { SupabaseAuthMiddleware } from './middleware/supabase-auth.js';
import { createSocketServer } from './config/socketConfig.js';
import { setupSocketHandlers } from './handlers/socketHandlers.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import { RoomManager } from './services/RoomManager.js';
import { createLobbyRouter } from './routes/lobby.js';
import { createRoomRouter } from './routes/room.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';

const app: Express = express();

// Initialize services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);
const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();

// Create HTTP server with Socket.IO
const { httpServer, io } = createSocketServer(app);

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174", // Alternative port
    "http://localhost:3000",  // Legacy port
    "http://localhost:4173"   // Vite preview port
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware.handleSessionCookies());

// Mount all gameserver routes under /gameserver prefix
app.use('/gameserver/auth', authRoutes);
app.use('/gameserver/api', apiRoutes);
app.use('/gameserver/lobby', createLobbyRouter(roomManager));
app.use('/gameserver/room', createRoomRouter(roomManager, io));

// Gameserver health check
app.get('/gameserver/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gameserver', timestamp: new Date().toISOString() });
});

// WebSocket connection handler
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket, roomManager, connectionManager);
});

const PORT = process.env.GAMESERVER_PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server enabled`);
  logger.info(`Supabase integration enabled`);
});

// Export for potential testing
export { app, database, authService };