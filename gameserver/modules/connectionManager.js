/** Room membership is keyed by stable player ID; names are display labels only. */
export class ConnectionManager {
  constructor() {
    this.connections = Object.create(null);
  }

  /** Bind a player's current socket, returning any connection it replaces. */
  addConnection(socket) {
    const { room, username } = socket.handshake.auth;
    const { playerId } = socket.data;
    this.connections[room] ??= Object.create(null);
    const previous = this.connections[room][playerId];
    this.connections[room][playerId] = {
      playerId,
      username,
      socketId: socket.id,
      joinRoom: (roomName) => socket.join(roomName),
      leaveRoom: (roomName) => socket.leave(roomName),
    };
    return previous;
  }

  /** Remove only the current socket, never a replacement that reconnected first. */
  removeConnection(socket) {
    const { room } = socket.handshake.auth;
    const { playerId } = socket.data;
    if (this.connections[room]?.[playerId]?.socketId !== socket.id)
      return false;
    delete this.connections[room][playerId];
    if (!Object.keys(this.connections[room]).length)
      delete this.connections[room];
    return true;
  }

  /** Rename the authenticated caller without moving their membership or game state. */
  renamePlayer(socket, username) {
    const player = this.getConnections(socket.handshake.auth.room)[
      socket.data.playerId
    ];
    if (
      !player ||
      player.socketId !== socket.id ||
      typeof username !== "string" ||
      !username.trim() ||
      username.trim().length > 40 ||
      /[\x00-\x1f]/.test(username)
    ) {
      return {
        status: "error",
        message: "Enter a name between 1 and 40 characters.",
      };
    }
    player.username = username.trim();
    socket.handshake.auth.username = player.username;
    return { status: "ok", username: player.username };
  }

  /** Get connected players keyed by stable ID, including server-only socket operations. */
  getConnections(room) {
    return this.connections[room] || {};
  }

  /** Public roster: never expose socket operations or the private reconnect token. */
  getRoster(room) {
    return Object.values(this.getConnections(room)).map(
      ({ playerId, username }) => ({ playerId, username }),
    );
  }
}
