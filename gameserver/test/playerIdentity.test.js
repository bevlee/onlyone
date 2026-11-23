import { expect } from "chai";
import { playerIdFromToken } from "../modules/playerIdentity.js";

describe("player identity token", () => {
  const token = "11111111-1111-4111-8111-111111111111";
  it("derives the same public ID after reconnect, without exposing the reconnect token", () => {
    expect(playerIdFromToken(token)).to.equal(playerIdFromToken(token));
    expect(playerIdFromToken(token)).to.match(/^[a-f0-9]{64}$/);
    expect(playerIdFromToken(token)).not.to.equal(token);
  });
  it("keeps independent players distinct", () => {
    expect(playerIdFromToken(token)).not.to.equal(
      playerIdFromToken("22222222-2222-4222-8222-222222222222"),
    );
  });
  for (const invalid of [undefined, "", "Alice", 42, {}, "not-a-token"]) {
    it(`rejects invalid identity ${JSON.stringify(invalid)}`, () => {
      expect(() => playerIdFromToken(invalid)).to.throw("reconnect token");
    });
  }
});
