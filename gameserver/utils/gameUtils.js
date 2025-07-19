import { logger } from '../config/logger.js';

/**
 * Game utility functions
 */

/**
 * Generate random selection within bounds
 * @param {number} upperBound - Maximum value (exclusive)
 * @returns {number} Random integer between 0 and upperBound-1
 */
export const getRandomSelection = (upperBound) => {
  return Math.floor(Math.random() * upperBound);
};

/**
 * Placeholder for future game cleanup logic
 * @param {string} room - Room name
 */
export const finishGame = (room) => {
  // Placeholder for future game cleanup logic
};

/**
 * Wait for a condition to be met or timeout
 * @param {Function} checkCondition - Function that returns true when condition is met
 * @param {number} timeoutSeconds - Timeout in seconds (default: 20)
 * @returns {Promise} Resolves when condition is met or timeout occurs
 */
export function waitForCondition(checkCondition, timeoutSeconds = 20) {
  const timeout = timeoutSeconds * 1000;
  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      logger.debug('Checking for condition');
      if (checkCondition()) {
        clearInterval(intervalId);
        resolve("Condition met!");
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
      resolve("Timeout: Condition not met within the given time");
    }, timeout);
  });
}

/**
 * Stop an active game and clean up resources
 * @param {Server} io - Socket.IO server instance
 * @param {string} roomName - Room name
 * @param {GameStateManager} gameStateManager - Game state manager instance
 * @param {ConnectionManager} connectionManager - Connection manager instance
 */
export function stopGame(io, roomName, gameStateManager, connectionManager) {
  logger.info({ roomName }, 'Stopping game in room');
  
  if (gameStateManager.gameExists(roomName)) {
    const writerRoom = roomName + ".writer";
    const guesserRoom = roomName + ".guesser";

    // Notify all players to return to main scene
    io.to(writerRoom).emit("changeScene", "main", "");
    io.to(guesserRoom).emit("changeScene", "main", "");
    
    // Remove all players from game-specific rooms
    const connections = connectionManager.getConnections(roomName);
    for (let value of Object.values(connections)) {
      value.leaveRoom(writerRoom);
      value.leaveRoom(guesserRoom);
    }
    
    // Clean up game state
    gameStateManager.deleteGame(roomName);
  }
}