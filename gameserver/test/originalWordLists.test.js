import { expect } from "chai";
import express from "express";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OriginalWordLists,
  parseOriginalWords,
} from "../modules/originalWordLists.js";
import { createOriginalWordListsApi } from "../handlers/originalWordListsApi.js";

const defaults = { easy: ["kangaroo"], medium: ["wombat"], hard: ["quokka"] };
const apiKey = "test-only-word-list-key";

describe("Original word list API", () => {
  let directory, store, server, url;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "original-words-"));
    store = new OriginalWordLists({
      filePath: join(directory, "words.json"),
      defaults,
    });
    const app = express();
    app.use(
      "/api/original-words",
      createOriginalWordListsApi({ store, apiKey, logger: { error() {} } }),
    );
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    url = `http://127.0.0.1:${server.address().port}/api/original-words`;
  });
  afterEach(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    rmSync(directory, { recursive: true, force: true });
  });
  const request = (path, options = {}) =>
    fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${apiKey}`, ...options.headers },
    });
  const replace = (path, text) =>
    request(path, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });

  it("reads the built-in lists before any upload", async () => {
    const response = await request(`${url}/easy`);
    expect(response.status).to.equal(200);
    expect(response.headers.get("cache-control")).to.equal("no-store");
    expect(await response.json()).to.deep.equal({
      difficulty: "easy",
      count: 1,
      words: ["kangaroo"],
    });
  });

  it("replaces, trims and deduplicates words, preserves phrases, and survives restarting the store", async () => {
    const liveLists = store.words;
    const response = await replace(
      `${url}/easy`,
      "  New York  \r\n\r\nLoki\nLOKI\rSpider-Man\n",
    );
    expect(response.status).to.equal(200);
    const expected = ["New York", "Loki", "Spider-Man"];
    expect(await response.json()).to.deep.equal({
      difficulty: "easy",
      count: 3,
      words: expected,
    });
    expect(liveLists.easy).to.deep.equal(expected);
    expect(liveLists.medium).to.deep.equal(defaults.medium);
    expect(defaults.easy).to.deep.equal(["kangaroo"]);
    const restarted = new OriginalWordLists({
      filePath: store.filePath,
      defaults,
    });
    expect(restarted.words.easy).to.deep.equal(expected);
    expect(restarted.words.hard).to.deep.equal(defaults.hard);
    await replace(`${url}/medium`, "Elephant");
    expect(
      new OriginalWordLists({ filePath: store.filePath, defaults }).words.easy,
    ).to.deep.equal(expected);
  });

  it("requires authentication for reads and writes without altering the saved list", async () => {
    for (const method of ["GET", "PUT"]) {
      for (const Authorization of ["", "Bearer wrong-key", "Basic test"]) {
        const response = await request(`${url}/easy`, {
          method,
          headers: { Authorization },
        });
        expect(response.status).to.equal(401);
      }
    }
    expect(store.words).to.deep.equal(defaults);
  });

  it("rejects unknown difficulties and unsupported content types", async () => {
    expect((await replace(`${url}/community`, "Loki")).status).to.equal(404);
    expect(
      (
        await request(`${url}/easy`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: "[]",
        })
      ).status,
    ).to.equal(415);
  });

  for (const text of [
    "\n  \r\n",
    "x".repeat(61),
    "good\nbad\u0000word",
    "<redacted>",
    "bad\tword",
  ]) {
    it(`rejects invalid text ${JSON.stringify(text)} without changing the list`, async () => {
      await replace(`${url}/easy`, "Valid word");
      const before = readFileSync(store.filePath, "utf8");
      expect((await replace(`${url}/easy`, text)).status).to.equal(400);
      expect(store.words.easy).to.deep.equal(["Valid word"]);
      expect(readFileSync(store.filePath, "utf8")).to.equal(before);
    });
  }

  it("rejects oversized uploads", async () => {
    expect(
      (await replace(`${url}/easy`, "x".repeat(1024 * 1024 + 1))).status,
    ).to.equal(413);
    expect(store.words.easy).to.deep.equal(defaults.easy);
  });

  it("keeps the previous list when saving fails", async () => {
    store.filePath = directory;
    expect((await replace(`${url}/easy`, "Replacement")).status).to.equal(500);
    expect(store.words.easy).to.deep.equal(defaults.easy);
  });

  it("disables the API when no key is configured", async () => {
    const app = express();
    app.use(createOriginalWordListsApi({ store, logger: { error() {} } }));
    const disabled = app.listen(0, "127.0.0.1");
    await once(disabled, "listening");
    try {
      const response = await fetch(
        `http://127.0.0.1:${disabled.address().port}/easy`,
      );
      expect(response.status).to.equal(503);
    } finally {
      await new Promise((resolve) => disabled.close(resolve));
    }
  });

  it("enforces the distinct word limit", () => {
    expect(() =>
      parseOriginalWords(
        Array.from({ length: 10001 }, (_, index) => `word ${index}`).join("\n"),
      ),
    ).to.throw(RangeError);
  });
});
