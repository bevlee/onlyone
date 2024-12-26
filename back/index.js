import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET"],
  },
});
// list of connections per room
const connections = {};
let activeGames = {};

//GAME VARS
const categories = ["animals", "people", "places"];
const secretWords = {
  animals: ["dog", "cat", "rabbit", "cheetah"],
  people: ["obama", "eminem", "stalin", "taylor swift", "bruno mars"],
  places: ["tokyo", "kyoto", "nara", "seoul"],
};

// io.socket.removeAllListeners();
io.on("connection", async (socket) => {
  socket.removeAllListeners("startGame");
  // console.log("Handshake Auth:", socket.handshake.auth);

  addConnection(socket);
  const room = socket.handshake.auth.room;
  const username = socket.handshake.auth.username;
  socket.join(room);

  socket.on("chat message", async (msg, username, callback) => {
    console.log("received chat message", msg, username);
    callback("nice");
  });

  //
  socket.to(room).emit("playerJoined", username);
  let rooms = io.sockets.adapter.rooms;
  console.log("the current connected clients are ", rooms);
  socket.emit("joinRoom", connections[room]);

  socket.on("changeName", async (newName, oldName, room, callback) => {
    console.log("existing room connections:", connections[room]);
    if (connections[room][newName]) {
      callback({
        status: "nameExists",
      });
    } else {
      connections[room][newName] = connections[room][oldName];
      connections[room].remove(oldName);
      callback({
        status: "ok",
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(reason + " disconnected");
    // console.log(socket.handshake.auth?.username + " username");
    removeConnection(socket);

    socket.to(room).emit("playerLeft", username);
  });

  socket.on("startGame", () => {
    console.log(
      new Date(),
      "number of scoket listerned to startgame",
      socket.listenerCount("startGame")
    );

    const time = 20;
    console.log("startGame called by socket:", socket.id);
    if (!(room in activeGames)) {
      console.log("no active game currently");
      startGameLoop(io, room, time);
    } else {
      console.log("there is an active game currently");
    }
  });

  socket.on("stopGame", (roomName) => {
    stopGame(socket, roomName);
  });

  socket.on("chooseCategory", (category) => {
    console.log("choosing category with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "chooseCategory") {
      activeGames[room]["category"] = category;
    }
  });
  socket.on("submitClue", (clue) => {
    console.log("submitting clue with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "writeClues") {
      activeGames[room]["clues"].push(clue);
    }
  });
  socket.on("guessWord", (guess) => {
    console.log("guessing word with activegames:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "guessWord") {
      activeGames[room]["guess"] = guess;
    }
  });

  if (!socket.recovered) {
    //console.log("we did not recover");
  }
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});

const getRandomSelection = (upperBound) => {
  return Math.floor(Math.random() * upperBound);
};
const finishGame = (room) => {
  // activeGames.remove(room);
};
const startGameLoop = async (io, room, timeLimit) => {
  let gameFinished = false;

  activeGames[room] = {
    stage: "chooseCategory",
    category: "",
  };

  const writerRoom = room + ".writer";
  const guesserRoom = room + ".guesser";

  // one round of each player being the guesser
  // for (let guesser of Object.keys(connections[room])) {
  const guesser = Object.keys(connections[room])[0];
  // set up by creating new room for guesser and writers
  connections[room][guesser].joinRoom(guesserRoom);
  connections[room][guesser].leaveRoom(writerRoom);
  let writers = [];
  let allPlayers = Object.entries(connections[room]);
  for (let [playerKey, playerValue] of allPlayers) {
    // console.log(`${playerKey} is playerkey and ${guesser} is guesser`);
    if (playerKey != guesser) {
      playerValue.joinRoom(writerRoom);
      playerValue.leaveRoom(guesserRoom);
      writers.push([playerKey, playerValue]);
    }
  }
  // wait for the guesser to choose a category
  io.to(writerRoom).emit("chooseCategory", "writer", []);
  io.to(guesserRoom).emit("chooseCategory", "guesser", categories);
  await waitForCondition(() => {
    return activeGames[room]["category"] !== "";
  }, timeLimit);
  console.log("chooseCategory condition finished");
  // set the category to a random one if not picked
  if (activeGames[room]["category"] === "") {
    activeGames[room]["category"] = "a";
  }
  const category = activeGames[room]["category"];
  //get secret word from list of words in chosen category
  console.log(activeGames[room]);
  activeGames[room]["stage"] = "writeClues";
  activeGames[room]["clues"] = [];
  const secretWord =
    secretWords[category][getRandomSelection(secretWords[category].length)];
  console.log(secretWord, secretWords);
  io.to(writerRoom).emit("writeClues", "writer", secretWord);
  io.to(guesserRoom).emit("writeClues", "guesser", "");

  // wait for the writers to submit clues
  await waitForCondition(() => {
    return activeGames[room]["clues"].length >= writers.length;
  }, timeLimit);

  // set the category to a random one if not picked
  if (activeGames[room]["clues"].length < writers.length) {
    for (let i = activeGames[room]["clues"].length; i < writers.length; i++) {
      activeGames[room]["clues"].push("lmao" + i);
    }
  }
  const clues = activeGames[room]["clues"];
  const dedupedClues = clues.slice();
  for (let i = 0; i < clues.length; i++) {
    for (let j = 0; j < clues.length; j++) {
      if (i != j) {
        if (sameWord(clues[i], clues[j])) {
          dedupedClues[i] = "<redacted>";
          dedupedClues[j] = "<redacted>";
        }
      }
    }
  }
  console.log(dedupedClues, clues);
  io.to(writerRoom).emit("guessWord", "writer", dedupedClues, clues);
  io.to(guesserRoom).emit("guessWord", "guesser", dedupedClues, []);
  activeGames[room]["stage"] = "guessWord";
  activeGames[room]["guess"] = "";
  // wait for the writers to submit clues
  await waitForCondition(() => {
    return activeGames[room]["guess"] !== "";
  }, timeLimit);
  const guess = activeGames[room]["guess"] || "how";
  console.log(`ending game`, dedupedClues, clues, guess, category, secretWord);
  io.to(room).emit("endGame", dedupedClues, clues, guess, category, secretWord);
};

const sameWord = (wordA, wordB) => {
  let stemmedA = getStem(wordA);
  let stemmedB = getStem(wordB);
  return stemmedA == stemmedB;
};
const getStem = (word) => {
  return word.trim().toLowerCase();
};

function waitForCondition(checkCondition, timeoutSeconds = 20) {
  const timeout = timeoutSeconds * 1000;
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      console.log("checking for condition ");
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

const addConnection = (socket) => {
  console.log("adding connection to ", connections);
  const auth = socket.handshake.auth;
  const room = auth.room;
  if (!connections[room]) {
    connections[room] = {};
  }
  connections[room][auth.username] = {
    role: "",
    playerId: socket.id,
    // pass through the joinroom function
    joinRoom: function (roomName) {
      socket.join(roomName);
    },
    leaveRoom: function (roomName) {
      socket.leave(roomName);
    },
  };
};

const removeConnection = (socket) => {
  console.log("removing connection to ", connections);
  const auth = socket.handshake.auth;
  const username = socket.handshake.auth.username;
  const room = auth.room;

  if (connections[room]) {
    delete connections[room][username];
    if (Object.keys(connections[room]).length === 0) {
      delete connections[room]; // Clean up empty rooms
    }
  }
};

function stopGame(io, roomName) {
  console.log("stopping game in room ", roomName);
  // remove the room from activegames if its active
  if (roomName in activeGames) {
    const writerRoom = roomName + ".writer";
    const guesserRoom = roomName + ".guesser";

    io.to(writerRoom).emit("changeScene", "main", "");
    io.to(guesserRoom).emit("changeScene", "main", "");
    // stop all rooms
    for (let value of Object.values(connections[roomName])) {
      value.leaveRoom(writerRoom);
      value.leaveRoom(guesserRoom);
    }
  }
}
