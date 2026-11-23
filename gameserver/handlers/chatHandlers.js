import { logger } from "../config/logger.js";

/** Create the chat acknowledgement handler. */
export function handleChatMessage() {
  return (msg, username, callback) => {
    logger.info({ msg, username }, "Received chat message");
    callback("nice");
  };
}

/** Rename only the caller's display label and publish the updated roster. */
export function handleChangeName(connectionManager, io, socket) {
  return (newName, callback) => {
    const result = connectionManager.renamePlayer(socket, newName);
    if (result.status === "ok") {
      io.to(socket.handshake.auth.room).emit(
        "roomPlayers",
        connectionManager.getRoster(socket.handshake.auth.room),
      );
    }
    if (typeof callback === "function") callback(result);
  };
}

/** Ignore superseded sockets; otherwise publish the current membership after disconnect. */
export function handleDisconnect(connectionManager, socket) {
  return () => {
    if (connectionManager.removeConnection(socket)) {
      const room = socket.handshake.auth.room;
      socket.to(room).emit("roomPlayers", connectionManager.getRoster(room));
    }
  };
}
