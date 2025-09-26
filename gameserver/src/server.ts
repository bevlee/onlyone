import { config } from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import roomRoutes from './routes/room';
import { logger } from './config/logger';

// Load environment variables from root .env file
config({ path: '../../.env' });

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());
app.use('/room', roomRoutes);

const PORT = process.env.GAMESERVER_PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { io };