import { expect } from "chai";
import sinon from "sinon";
import { ConnectionManager } from "../modules/connectionManager.js";

function socket(
  playerId,
  socketId = "socket-1",
  username = "Alice",
  room = "ROOM",
) {
  return {
    id: socketId,
    data: { playerId },
    handshake: { auth: { room, username } },
    join: sinon.spy(),
    leave: sinon.spy(),
  };
}

describe("stable player identity", () => {
  it("renames only the display label and removes the renamed player on disconnect", () => {
    const manager = new ConnectionManager();
    const client = socket("player-1");
    manager.addConnection(client);
    expect(manager.renamePlayer(client, "Alicia").status).to.equal("ok");
    expect(Object.keys(manager.getConnections("ROOM"))).to.deep.equal([
      "player-1",
    ]);
    expect(manager.getRoster("ROOM")).to.deep.equal([
      { playerId: "player-1", username: "Alicia" },
    ]);
    expect(manager.removeConnection(client)).to.equal(true);
    expect(manager.getRoster("ROOM")).to.deep.equal([]);
  });

  it("keeps different players distinct when their display names match", () => {
    const manager = new ConnectionManager();
    manager.addConnection(socket("player-1", "socket-1"));
    manager.addConnection(socket("player-2", "socket-2"));
    expect(Object.keys(manager.getConnections("ROOM"))).to.have.length(2);
  });

  it("ignores a stale disconnect after the same player reconnects", () => {
    const manager = new ConnectionManager();
    const oldClient = socket("player-1", "old");
    const newClient = socket("player-1", "new", "Alicia");
    manager.addConnection(oldClient);
    manager.addConnection(newClient);
    expect(manager.removeConnection(oldClient)).to.equal(false);
    expect(manager.getConnections("ROOM")["player-1"].socketId).to.equal("new");
    expect(manager.getRoster("ROOM")).to.deep.equal([
      { playerId: "player-1", username: "Alicia" },
    ]);
    expect(manager.renamePlayer(oldClient, "Stale").status).to.equal("error");
  });

  it("rebinds room operations to the new socket without changing identity", () => {
    const manager = new ConnectionManager();
    const oldClient = socket("player-1", "old");
    const newClient = socket("player-1", "new");
    manager.addConnection(oldClient);
    manager.addConnection(newClient);
    const player = manager.getConnections("ROOM")["player-1"];
    player.joinRoom("ROOM.writer");
    player.leaveRoom("ROOM.guesser");
    expect(newClient.join.calledWith("ROOM.writer")).to.equal(true);
    expect(newClient.leave.calledWith("ROOM.guesser")).to.equal(true);
    expect(oldClient.join.called).to.equal(false);
  });

  it("validates names and only changes the caller’s own record", () => {
    const manager = new ConnectionManager();
    const alice = socket("player-1");
    manager.addConnection(alice);
    manager.addConnection(socket("player-2", "socket-2", "Bob"));
    expect(manager.renamePlayer(alice, "").status).to.equal("error");
    expect(manager.renamePlayer(alice, "A".repeat(41)).status).to.equal(
      "error",
    );
    manager.renamePlayer(alice, "  Alicia  ");
    expect(manager.getConnections("ROOM")["player-1"].username).to.equal(
      "Alicia",
    );
    expect(manager.getConnections("ROOM")["player-2"].username).to.equal("Bob");
  });

  it("removes empty rooms and safely ignores unknown disconnects", () => {
    const manager = new ConnectionManager();
    const client = socket("player-1");
    expect(manager.removeConnection(client)).to.equal(false);
    manager.addConnection(client);
    manager.removeConnection(client);
    expect(manager.connections).not.to.have.property("ROOM");
  });
});
