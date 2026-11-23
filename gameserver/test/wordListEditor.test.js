import { expect } from "chai";
import express from "express";
import sinon from "sinon";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OriginalWordLists } from "../modules/originalWordLists.js";
import { createOriginalWordListsApi } from "../handlers/originalWordListsApi.js";

describe("Word list editor sessions", () => {
  let directory, server, url, store;
  const editorHeader = { "X-Word-List-Editor": "1" };
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "word-editor-"));
    store = new OriginalWordLists({
      filePath: join(directory, "words.json"),
      defaults: { easy: ["cat", "dog"], medium: ["wombat"], hard: ["quokka"] },
    });
    const app = express();
    app.use(
      "/api/original-words",
      createOriginalWordListsApi({
        store,
        adminPassword: "test-editor-password",
        secureCookies: false,
        logger: { error() {} },
      }),
    );
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    url = `http://127.0.0.1:${server.address().port}/api/original-words`;
  });
  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  const login = (url, password = "test-editor-password") =>
    fetch(`${url}/session`, {
      method: "POST",
      headers: { ...editorHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  const cookieFrom = (response) =>
    response.headers.get("set-cookie").split(";")[0];

  it("rejects a wrong password and does not expose protected lists", async () => {
    expect(
      (await fetch(`${url}/easy`, { headers: editorHeader })).status,
    ).to.equal(401);
    const response = await login(url, "wrong");
    expect(response.status).to.equal(401);
    expect(response.headers.get("set-cookie")).to.equal(null);
  });
  it("restores a session and revokes it on sign out", async () => {
    const response = await login(url);
    expect(response.status).to.equal(200);
    expect(response.headers.get("set-cookie"))
      .to.include("HttpOnly")
      .and.include("SameSite=Strict");
    const headers = { ...editorHeader, Cookie: cookieFrom(response) };
    expect(
      await (await fetch(`${url}/session`, { headers })).json(),
    ).to.deep.equal({ authenticated: true });
    expect((await fetch(`${url}/easy`, { headers })).status).to.equal(200);
    expect(
      (await fetch(`${url}/session`, { method: "DELETE", headers })).status,
    ).to.equal(200);
    expect((await fetch(`${url}/easy`, { headers })).status).to.equal(401);
  });
  it("rejects cross-site form requests without the editor header", async () => {
    expect(
      (
        await fetch(`${url}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "test-editor-password" }),
        })
      ).status,
    ).to.equal(403);
    const cookie = cookieFrom(await login(url));
    expect(
      (
        await fetch(`${url}/easy/words`, {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "text/plain" },
          body: "lion",
        })
      ).status,
    ).to.equal(401);
    expect(store.words.easy).to.deep.equal(["cat", "dog"]);
  });
  it("adds and removes individual words without overwriting unrelated changes", async () => {
    const headers = {
      ...editorHeader,
      Cookie: cookieFrom(await login(url)),
      "Content-Type": "text/plain",
    };
    const change = (method, word) =>
      fetch(`${url}/easy/words`, { method, headers, body: word });
    for (const word of ["New York", "Loki", "LOKI"])
      expect((await change("POST", word)).status).to.equal(200);
    expect((await change("DELETE", "cat")).status).to.equal(200);
    expect((await change("DELETE", "cat")).status).to.equal(200);
    expect(store.words.easy).to.deep.equal(["dog", "New York", "Loki"]);
    expect((await change("POST", "one\ntwo")).status).to.equal(400);
    expect((await change("POST", "<redacted>")).status).to.equal(400);
    expect(
      (
        await fetch(`${url}/medium/words`, {
          method: "DELETE",
          headers,
          body: "wombat",
        })
      ).status,
    ).to.equal(400);
  });
  it("expires sessions after eight hours", async () => {
    const headers = { ...editorHeader, Cookie: cookieFrom(await login(url)) };
    const expiredAt = Date.now() + 8 * 60 * 60 * 1000 + 1;
    const clock = sinon.stub(Date, "now").returns(expiredAt);
    try {
      expect((await fetch(`${url}/easy`, { headers })).status).to.equal(401);
    } finally {
      clock.restore();
    }
  });

  it("limits repeated failed password attempts", async () => {
    for (let i = 0; i < 10; i++)
      expect((await login(url, "wrong")).status).to.equal(401);
    expect((await login(url, "wrong")).status).to.equal(429);
  });
});
