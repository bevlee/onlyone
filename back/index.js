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
    if (room in activeGames) {
      console.log("no active game currently");
      activeGames[room] = {
        stage: "chooseCategory",
      };
      startGame(io, room, time);
    } else {
      console.log("there is an active game currently");
    }
  });

  socket.on("stopGame", (roomName) => {
    stopGame(socket, roomName);
  });

  socket.on("guessWord", (word) => {
    if (activeGames[roomName] && activeGames[roomName][stage] == "guessWord") {
      activeGames[roomName][guess] = word;
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
  return Math.floor(Math.random() * upperBound) - 1;
};
const finishGame = (room) => {
  // activeGames.remove(room);
};

const startGame = async (io, room, timer) => {
  console.log("startGame called");
  console.log("active games", activeGames);
  // game loop here
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

  let rooms = io.sockets.adapter.rooms;
  // console.log("the current connected clients are ", rooms);
  // stop processing if the game has exited
  // if (!activeGames.has(room)) return;
  console.log("going to choose category");
  io.to(writerRoom).emit("changeScene", "chooseCategory", "writer");
  io.to(guesserRoom).emit("changeScene", "chooseCategory", "guesser");

  // console.log(writers, "are the writers");
  // console.log(guesser, "si the guesser");
  // console.log("current rooms", io.sockets.adapter.rooms);

  // give users prompts
  // guesser chooses a category
  // const categoryResponse = await socket.to(writerRoom).timeout(21000).emitWithAck("chooseCategory", ["a","b","c"], 20)
  const categories = ["a", "b", "c"];
  const secretWords = {
    a: [1, 2, 3, 4, 5],
    b: [11, 12, 13, 14, 15],
    c: [21, 22, 23, 24, 25],
  };
  // wait for guesser to choose a category
  // io.to(room).emit("chooseCategory", categories, timer);
  const categoryResponse = await getCategoryChoice(
    socket,
    guesserRoom,
    categories,
    timer
  );
  let category;
  if (categoryResponse) {
    category = categoryResponse;
  } else {
    // get a random category
    category = categories[getRandomSelection(categories.length)];
  }
  const secretWord = secretWords[getRandomSelection(secretWords.length)];

  // Let writers enter their clues

  // console.log("the current connected clients are ", rooms);
  // stop processing if the game has exited
  // if (!activeGames.has(room)) return;
  // console.log("going to change scenee");
  // console.log("the current connected clients are ", rooms);
  io.to(writerRoom).emit("changeScene", "writeClues", "writer");
  io.to(guesserRoom).emit("changeScene", "writeClues", "guesser");
  // io.to(room).emit("writeClues", secretWord, timer);
  let clues = await getClueChoice(
    socket,
    secretWord,
    writerRoom,
    writers.length,
    timer
  );
  while (clues.length < writers.length) {
    clues.push("lol");
  }
  // console.log("all the clues are", clues);
  // // }
  // console.log("the current connected clients are ", rooms);

  // stop processing if the game has exited
  // if (!activeGames.has(room)) return;
  console.log("going to guess word scenee");
  io.to(writerRoom).emit("changeScene", "guessWord", "writer");
  io.to(guesserRoom).emit("changeScene", "guessWord", "guesser");
  // await new Promise(async (resolve) => {
  //   setTimeout(() => {
  //     resolve();
  //     console.log("waiteed 5sec");
  //   }, 5000);
  // });
  let guess = await getGuessedWord(
    socket,
    secretWord,
    writerRoom,
    writers.length,
    timer
  );
  io.to(room).emit("endGame", secretWord, guess);
  // stopGame(io, room);
  console.log("GAME ENDED ");
};
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

function getCategoryChoice(socket, room, categories, timer) {
  return new Promise((resolve) => {
    const time = 20;

    // Timeout after 20 seconds
    setTimeout(() => {
      console.log("Client did not respond in time.");
      socket.off("userChoice", () => {});
      resolve(null); // Proceed with no response
    }, timer * 1000);

    // Listen for the client's choice
    socket.once("userChoice", (choice) => {
      socket.off("userChoice", () => {});
      resolve(choice);
    });
  });
}

function getClueChoice(socket, secretWord, room, maxClues, timer) {
  return new Promise((resolve) => {
    let clues = [];

    // Timeout after 20 seconds
    setTimeout(() => {
      console.log(
        "Client did not respond in time.",
        socket.handshake.auth?.username
      );
      socket.off("submitClue", () => {});
      resolve(clues); // Proceed with no response
    }, timer * 1000);

    // Listen for the client's choice
    socket.on("submitClue", (choice) => {
      clues.push(choice);
      if (clues.length >= maxClues) {
        io.off("submitClue", () => {});
        resolve(clues);
      }
    });
  });
}

function getGuessedWord(io, room, categories, timer) {
  return new Promise((resolve) => {
    // Timeout after 20 seconds
    setTimeout(() => {
      console.log("Client did not respond in time.");
      socket.off("guessWord", () => {});
      resolve(null); // Proceed with no response
    }, timer * 1000);

    // Listen for the guesser's choice
    socket.once("guessWord", (word) => {
      socket.off("guessWord", () => {});
      resolve(word);
    });
  });
}

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
