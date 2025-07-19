import { dedupeClues } from "../wordOperations.js";
import { logger } from '../config/logger.js';

export class GameLoop {
  constructor(gameStateManager, connectionManager) {
    this.gameStateManager = gameStateManager;
    this.connectionManager = connectionManager;
  }

  async startGameLoop(io, room, timeLimit, categories, secretWords, getStem) {
    let round = 0;
    let winCount = 0;
    const writerRoom = room + ".writer";
    const guesserRoom = room + ".guesser";
    const connections = this.connectionManager.getConnections(room);
    const playerCount = Object.keys(connections).length;
    
    for (let guesser of Object.keys(connections)) {
      this.gameStateManager.createGame(room, playerCount);
      this.gameStateManager.setGameProgress(room, round, winCount);
      
      this.setupRooms(connections, guesser, writerRoom, guesserRoom);
      const writers = this.getWriters(connections, guesser, writerRoom, guesserRoom);
      
      await this.categoryPhase(io, room, writerRoom, guesserRoom, categories, timeLimit);
      await this.cluePhase(io, room, writerRoom, guesserRoom, secretWords, timeLimit, writers);
      await this.votingPhase(io, room, writerRoom, guesserRoom, timeLimit);
      const success = await this.guessingPhase(io, room, writerRoom, guesserRoom, timeLimit, getStem);
      
      this.gameStateManager.setGameResult(room, success, this.gameStateManager.getGame(room).dedupedClues);
      round++;
      if (success) winCount++;
      
      io.to(room).emit("endGame", this.gameStateManager.getGame(room));
      await new Promise((resolve) => setTimeout(() => resolve(), 5000));
    }
    
    this.gameStateManager.deleteGame(room);
  }

  setupRooms(connections, guesser, writerRoom, guesserRoom) {
    connections[guesser].joinRoom(guesserRoom);
    connections[guesser].leaveRoom(writerRoom);
  }

  getWriters(connections, guesser, writerRoom, guesserRoom) {
    const writers = [];
    const allPlayers = Object.entries(connections);
    
    for (let [playerKey, playerValue] of allPlayers) {
      if (playerKey !== guesser) {
        playerValue.joinRoom(writerRoom);
        playerValue.leaveRoom(guesserRoom);
        writers.push([playerKey, playerValue]);
      }
    }
    
    return writers;
  }

  async categoryPhase(io, room, writerRoom, guesserRoom, categories, timeLimit) {
    io.to(writerRoom).emit("chooseCategory", "writer", []);
    io.to(guesserRoom).emit("chooseCategory", "guesser", categories);
    
    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.category !== "";
    }, timeLimit);
    
    logger.debug({ room }, 'Choose category condition finished');
    
    if (this.gameStateManager.getGame(room)?.category === "") {
      const randomCategory = categories[this.getRandomSelection(categories.length)];
      this.gameStateManager.setCategory(room, randomCategory);
    }
  }

  async cluePhase(io, room, writerRoom, guesserRoom, secretWords, timeLimit, writers) {
    const game = this.gameStateManager.getGame(room);
    const category = game.category;
    
    this.gameStateManager.updateGameStage(room, "writeClues");
    this.gameStateManager.initializeClues(room);
    
    const secretWord = secretWords[category][this.getRandomSelection(secretWords[category].length)];
    this.gameStateManager.setSecretWord(room, secretWord);
    
    logger.debug({ secretWord, secretWordsCount: secretWords.length }, 'Selected secret word');
    io.to(writerRoom).emit("writeClues", "writer", secretWord);
    io.to(guesserRoom).emit("writeClues", "guesser", "");

    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.clues?.length >= writers.length;
    }, timeLimit);

    const currentGame = this.gameStateManager.getGame(room);
    if (currentGame.clues.length < writers.length) {
      for (let i = currentGame.clues.length; i < writers.length; i++) {
        this.gameStateManager.addClue(room, "<no answer>");
      }
    }
  }

  async votingPhase(io, room, writerRoom, guesserRoom, timeLimit) {
    const game = this.gameStateManager.getGame(room);
    const clues = game.clues;
    const machineDedupedClues = dedupeClues(clues);
    
    const clueVotes = machineDedupedClues.map((clue) =>
      clue !== "<redacted>" ? 0 : -1
    );
    
    this.gameStateManager.setVotes(room, clueVotes);
    this.gameStateManager.setFinishedVoting(room, false);
    
    logger.debug({ clueVotes }, 'Clue votes array');
    io.to(writerRoom).emit("filterClues", "writer", clueVotes, clues);
    io.to(guesserRoom).emit("filterClues", "guesser");
    this.gameStateManager.updateGameStage(room, "filterClues");

    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.finishedVoting;
    }, timeLimit);
  }

  async guessingPhase(io, room, writerRoom, guesserRoom, timeLimit, getStem) {
    const game = this.gameStateManager.getGame(room);
    const clues = game.clues;
    const clueVotes = game.votes;
    
    let dedupedClues = clues.slice();
    for (let i = 0; i < clues.length; i++) {
      dedupedClues[i] = clueVotes[i] >= 0 ? dedupedClues[i] : "<redacted>";
    }

    logger.debug({ dedupedClues, originalClues: clues }, 'Deduped clues vs original clues');
    io.to(writerRoom).emit("guessWord", "writer", dedupedClues, clues);
    io.to(guesserRoom).emit("guessWord", "guesser", dedupedClues, []);
    
    this.gameStateManager.updateGameStage(room, "guessWord");
    this.gameStateManager.setGuess(room, "");
    
    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.guess !== "";
    }, timeLimit);
    
    const currentGame = this.gameStateManager.getGame(room);
    const guess = currentGame.guess !== "" ? currentGame.guess : "<no guess>";
    const success = getStem(guess) === currentGame.secretWord;
    
    game.dedupedClues = dedupedClues;
    
    return success;
  }

  getRandomSelection(upperBound) {
    return Math.floor(Math.random() * upperBound);
  }

  waitForCondition(checkCondition, timeoutSeconds = 20) {
    const timeout = timeoutSeconds * 1000;
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        logger.debug('Checking for condition in game loop');
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
}