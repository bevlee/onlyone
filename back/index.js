import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// const db = await open({
//   filename: "onlyone.db",
//   driver: sqlite3.Database,
// });
const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: "http://bevsoft.com:4173",
    methods: ["GET", "POST"],
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

  socket.on("changeName", (oldName, newName, room, callback) => {
    console.log("existing room connections:", connections[room]);
    console.log("changing name:", oldName, newName, callback);
    if (connections[room][newName]) {
      callback({
        status: "nameExists",
      });
    } else {
      connections[room][newName] = connections[room][oldName];
      delete connections[room][oldName];
      callback({
        status: "ok",
      });
    }

    console.log("new room connections:", connections[room]);
    io.to(room).emit("playerLeft", oldName);
    io.to(room).emit("playerJoined", newName);
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
  socket.on("updateVotes", (index, value) => {
    console.log("adding updates to votese:", index, value);
    if (activeGames[room] && activeGames[room]["stage"] == "filterClues") {
      // update the player votes
      activeGames[room]["votes"][index] += value;
      console.log("emitting update to votes", index, value);
      socket.to(room).emit("updateVotes", index, value);
    }
  });
  socket.on("finishVoting", () => {
    console.log("finishing voting for duplicate clues:", activeGames);
    if (activeGames[room] && activeGames[room]["stage"] == "filterClues") {
      activeGames[room]["finishedVoting"] = true;
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
  let round = 0;
  let winCount = 0;
  const writerRoom = room + ".writer";
  const guesserRoom = room + ".guesser";
  const playerCount = Object.keys(connections[room]).length;
  // one round of each player being the guesser
  for (let guesser of Object.keys(connections[room])) {
    //set room state
    activeGames[room] = {
      stage: "chooseCategory",
      category: "",
      gamesPlayed: round,
      gamesWon: winCount,
      playerCount: playerCount,
    };
    // set up by creating new room for guesser and writers
    connections[room][guesser].joinRoom(guesserRoom);
    connections[room][guesser].leaveRoom(writerRoom);

    let writers = [];
    let allPlayers = Object.entries(connections[room]);
    for (let [playerKey, playerValue] of allPlayers) {
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
      activeGames[room]["category"] =
        categories[getRandomSelection(categories.length)];
    }
    const category = activeGames[room]["category"];
    //get secret word from list of words in chosen category
    console.log(activeGames[room]);
    activeGames[room]["stage"] = "writeClues";
    activeGames[room]["clues"] = [];
    const secretWord =
      secretWords[category][getRandomSelection(secretWords[category].length)];
    activeGames[room]["secretWord"] = secretWord;
    console.log(secretWord, secretWords);
    io.to(writerRoom).emit("writeClues", "writer", secretWord);
    io.to(guesserRoom).emit("writeClues", "guesser", "");

    // wait for the writers to submit clues
    await waitForCondition(() => {
      return activeGames[room]["clues"].length >= writers.length;
    }, timeLimit);

    // fill in answers if writers did not submit
    if (activeGames[room]["clues"].length < writers.length) {
      for (let i = activeGames[room]["clues"].length; i < writers.length; i++) {
        activeGames[room]["clues"].push("<no answer>");
      }
    }

    const clues = activeGames[room]["clues"];
    const machineDedupedClues = clues.slice();
    for (let i = 0; i < clues.length; i++) {
      for (let j = 0; j < clues.length; j++) {
        if (i != j) {
          if (sameWord(clues[i], clues[j])) {
            machineDedupedClues[i] = "<redacted>";
            machineDedupedClues[j] = "<redacted>";
          }
        }
      }
    }
    // array of boolean to show users which answers are likely invalid
    const clueVotes = machineDedupedClues.map((clue) =>
      clue !== "<redacted>" ? 0 : -1
    );
    activeGames[room]["votes"] = clueVotes;
    console.log("clueVotes array looks like", clueVotes);
    activeGames[room]["finishedVoting"] = false;
    io.to(writerRoom).emit("filterClues", "writer", clueVotes, clues);
    io.to(guesserRoom).emit("filterClues", "guesser");
    activeGames[room]["stage"] = "filterClues";

    // wait for the writers to submit clues
    await waitForCondition(() => {
      return activeGames[room]["finishedVoting"];
    }, timeLimit);
    let dedupedClues = clues.slice();
    // cancel out additional voted clues
    for (let i = 0; i < clues.length; i++) {
      dedupedClues[i] = clueVotes[i] >= 0 ? dedupedClues[i] : "<redacted>";
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
    const guess =
      activeGames[room]["guess"] !== ""
        ? activeGames[room]["guess"]
        : "<no guess>";
    const success = getStem(guess) === secretWord;
    activeGames[room]["success"] = success;
    activeGames[room]["dedupedClues"] = dedupedClues;
    activeGames[room]["gamesPlayed"] = ++round;
    if (success) activeGames[room]["gamesWon"] = ++winCount;

    console.log(`ending game`);
    io.to(room).emit("endGame", activeGames[room]);

    await new Promise((resolve) => setTimeout(() => resolve(), 5000));
  }
  delete activeGames[room];
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
