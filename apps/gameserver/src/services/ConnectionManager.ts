import { Socket } from 'socket.io';
import { RoomPlayer } from '@onlyone/shared';

interface PlayerConnection {
  socket: Socket;
  player: RoomPlayer;
  roomName: string;
}

export class ConnectionManager {
  // Map of socketId -> connection details
  private connections = new Map<string, PlayerConnection>();

  // Map of roomName -> Set of socketIds
  private roomConnections = new Map<string, Set<string>>();

  addConnection(socket: Socket, player: RoomPlayer, roomName: string): void {
    this.connections.set(socket.id, { socket, player, roomName });

    if (!this.roomConnections.has(roomName)) {
      this.roomConnections.set(roomName, new Set());
    }
    this.roomConnections.get(roomName)!.add(socket.id);
  }

  removeConnection(socketId: string): PlayerConnection | undefined {
    const connection = this.connections.get(socketId);

    if (connection) {
      this.connections.delete(socketId);
      const roomSockets = this.roomConnections.get(connection.roomName);
      if (roomSockets) {
        roomSockets.delete(socketId);
        if (roomSockets.size === 0) {
          this.roomConnections.delete(connection.roomName);
        }
      }
    }

    return connection;
  }

  getConnectionsByRoom(roomName: string): PlayerConnection[] {
    const socketIds = this.roomConnections.get(roomName);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(id => this.connections.get(id))
      .filter((conn): conn is PlayerConnection => conn !== undefined);
  }

  getConnection(socketId: string): PlayerConnection | undefined {
    return this.connections.get(socketId);
  }
}