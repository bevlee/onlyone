import { expect } from "chai";
import sinon from "sinon";
import { ConnectionManager } from "../modules/connectionManager.js";
import {
  handleChangeName,
  handleDisconnect,
} from "../handlers/chatHandlers.js";

function client(id = "socket-1") {
  return {
    id,
    data: { playerId: "player-1" },
    handshake: { auth: { room: "ROOM", username: "Alice" } },
    join() {},
    leave() {},
    to: sinon.stub().returnsThis(),
    emit: sinon.spy(),
  };
}

describe("player event handlers", () => {
  it("publishes an ID-based roster after renaming the caller", () => {
    const manager = new ConnectionManager();
    const socket = client();
    const io = { to: sinon.stub().returnsThis(), emit: sinon.spy() };
    manager.addConnection(socket);
    const reply = sinon.spy();
    handleChangeName(manager, io, socket)("Alicia", reply);
    expect(reply.firstCall.args[0].status).to.equal("ok");
    expect(
      io.emit.calledWith("roomPlayers", [
        { playerId: "player-1", username: "Alicia" },
      ]),
    ).to.equal(true);
    expect(manager.getConnections("ROOM")["player-1"].username).to.equal(
      "Alicia",
    );
  });

  it("does not publish a roster when a name is invalid", () => {
    const manager = new ConnectionManager();
    const socket = client();
    const io = { to: sinon.stub().returnsThis(), emit: sinon.spy() };
    manager.addConnection(socket);
    const reply = sinon.spy();
    handleChangeName(manager, io, socket)("", reply);
    expect(reply.firstCall.args[0].status).to.equal("error");
    expect(io.emit.called).to.equal(false);
  });

  it("removes a renamed player and publishes the remaining roster", () => {
    const manager = new ConnectionManager();
    const socket = client();
    manager.addConnection(socket);
    manager.renamePlayer(socket, "Alicia");
    handleDisconnect(manager, socket)();
    expect(socket.emit.calledWith("roomPlayers", [])).to.equal(true);
    expect(manager.getRoster("ROOM")).to.deep.equal([]);
  });

  it("does not announce a player leaving when only their old socket disconnects", () => {
    const manager = new ConnectionManager();
    const oldSocket = client("old");
    const newSocket = client("new");
    manager.addConnection(oldSocket);
    manager.addConnection(newSocket);
    handleDisconnect(manager, oldSocket)();
    expect(oldSocket.emit.called).to.equal(false);
    expect(manager.getRoster("ROOM")).to.have.length(1);
  });
});
