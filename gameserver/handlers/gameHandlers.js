/**
 * Handler for the 'startGame' socket event. Starts a new game loop if one is not already active for the room.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @param {string} room - The room name.
 * @param {Object} activeGames - The active games state object.
 * @param {Function} startGameLoop - The function to start the game loop.
 * @returns {Function} The event handler function.
 */
export function handleStartGame(io, room, activeGames, startGameLoop) {
  return () => {
    const time = 20;
    if (!(room in activeGames)) {
      startGameLoop(io, room, time);
    }
  };
}

/**
 * Handler for the 'stopGame' socket event. Stops the game for the specified room.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @param {Function} stopGame - The function to stop the game.
 * @returns {Function} The event handler function.
 */
export function handleStopGame(io, stopGame) {
  return (roomName) => {
    stopGame(io, roomName);
  };
}

/**
 * Handler for the 'chooseCategory' socket event. Sets the chosen category for the current game stage.
 * @param {Object} activeGames - The active games state object.
 * @param {string} room - The room name.
 * @returns {Function} The event handler function.
 */
export function handleChooseCategory(activeGames, room) {
  return (category) => {
    if (activeGames[room] && activeGames[room]["stage"] == "chooseCategory") {
      activeGames[room]["category"] = category;
    }
  };
}

/**
 * Handler for the 'submitClue' socket event. Adds a clue to the current game's clues array.
 * @param {Object} activeGames - The active games state object.
 * @param {string} room - The room name.
 * @returns {Function} The event handler function.
 */
export function handleSubmitClue(activeGames, room) {
  return (clue) => {
    if (activeGames[room] && activeGames[room]["stage"] == "writeClues") {
      activeGames[room]["clues"].push(clue);
    }
  };
}

/**
 * Handler for the 'updateVotes' socket event. Updates the votes for clues during the filtering stage.
 * @param {Object} activeGames - The active games state object.
 * @param {string} room - The room name.
 * @param {import('socket.io').Socket} socket - The connected socket instance.
 * @returns {Function} The event handler function.
 */
export function handleUpdateVotes(activeGames, room, socket) {
  return (index, value) => {
    if (activeGames[room] && activeGames[room]["stage"] == "filterClues") {
      activeGames[room]["votes"][index] += value;
      socket.to(room).emit("updateVotes", index, value);
    }
  };
}

/**
 * Handler for the 'finishVoting' socket event. Marks voting as finished for the current game.
 * @param {Object} activeGames - The active games state object.
 * @param {string} room - The room name.
 * @returns {Function} The event handler function.
 */
export function handleFinishVoting(activeGames, room) {
  return () => {
    if (activeGames[room] && activeGames[room]["stage"] == "filterClues") {
      activeGames[room]["finishedVoting"] = true;
    }
  };
}

/**
 * Handler for the 'guessWord' socket event. Sets the guess for the current game.
 * @param {Object} activeGames - The active games state object.
 * @param {string} room - The room name.
 * @returns {Function} The event handler function.
 */
export function handleGuessWord(activeGames, room) {
  return (guess) => {
    if (activeGames[room] && activeGames[room]["stage"] == "guessWord") {
      activeGames[room]["guess"] = guess;
    }
  };
} 