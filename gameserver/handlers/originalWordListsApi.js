import { createHash, timingSafeEqual } from "node:crypto";
import express from "express";
import { difficulties } from "../data/data.js";
import { parseOriginalWords } from "../modules/originalWordLists.js";

import { createWordListEditorSessions } from "./wordListEditorSessions.js";

const digest = (value) => createHash("sha256").update(value).digest();

/** Protected read/replace API for the game's Original difficulty lists. */
export function createOriginalWordListsApi({
  store,
  apiKey,
  adminPassword,
  logger,
  secureCookies = process.env.NODE_ENV === "production",
}) {
  const router = express.Router();
  const expectedKey = apiKey ? digest(apiKey) : null;
  const editor = createWordListEditorSessions({
    password: adminPassword,
    secureCookies,
  });
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.use(editor.router);
  router.use((req, res, next) => {
    if (editor.isAuthenticated(req)) return next();
    if (!expectedKey && !adminPassword)
      return res
        .status(503)
        .json({ error: "Original word list API is not configured." });
    const authorization = req.get("Authorization") || "";
    const suppliedKey = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (!expectedKey || !timingSafeEqual(digest(suppliedKey), expectedKey)) {
      res.set("WWW-Authenticate", "Bearer");
      return res.status(401).json({ error: "A valid API key is required." });
    }
    next();
  });
  router.param("difficulty", (req, res, next, difficulty) => {
    if (!difficulties.includes(difficulty)) {
      return res.status(404).json({ error: "Choose easy, medium or hard." });
    }
    next();
  });
  const respond = (req, res) => {
    const difficulty = req.params.difficulty;
    const words = store.words[difficulty];
    res.json({ difficulty, count: words.length, words });
  };
  router.get("/:difficulty", respond);
  router.put(
    "/:difficulty",
    (req, res, next) => {
      if (!req.is("text/plain"))
        return res
          .status(415)
          .json({ error: "Send text/plain with one secret word per line." });
      next();
    },
    express.text({ type: "text/plain", limit: "1mb" }),
    (req, res) => {
      let words;
      try {
        words = parseOriginalWords(req.body || "");
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        return res.status(400).json({ error: error.message });
      }
      try {
        store.replace(req.params.difficulty, words);
      } catch (error) {
        logger.error({ error }, "Failed to save Original word list");
        return res.status(500).json({ error: "Could not save the word list." });
      }
      respond(req, res);
    },
  );
  router
    .route("/:difficulty/words")
    .all(
      (req, res, next) => {
        if (!req.is("text/plain"))
          return res
            .status(415)
            .json({ error: "Send the secret word as text/plain." });
        next();
      },
      express.text({ type: "text/plain", limit: "2kb" }),
    )
    .post((req, res) => changeWord(req, res, "add"))
    .delete((req, res) => changeWord(req, res, "remove"));

  function changeWord(req, res, action) {
    let incoming;
    try {
      incoming = parseOriginalWords(req.body || "");
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return res.status(400).json({ error: error.message });
    }
    if (incoming.length !== 1)
      return res.status(400).json({ error: "Provide one secret word." });
    const difficulty = req.params.difficulty;
    const current = store.words[difficulty];
    const key = incoming[0].toLowerCase();
    const exists = current.some((word) => word.toLowerCase() === key);
    const next =
      action === "remove"
        ? current.filter((word) => word.toLowerCase() !== key)
        : exists
          ? current
          : [...current, incoming[0]];
    if (!next.length)
      return res
        .status(400)
        .json({ error: "Keep at least one secret word in each difficulty." });
    if (next.length > 10000)
      return res
        .status(400)
        .json({ error: "A list can contain up to 10,000 secret words." });
    try {
      store.replace(difficulty, next);
    } catch (error) {
      logger.error({ error }, "Failed to save Original word list");
      return res.status(500).json({ error: "Could not save the word list." });
    }
    respond(req, res);
  }
  router.use((error, req, res, next) => {
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Word list must be under 1 MB." });
    if (error.status === 415)
      return res.status(415).json({ error: "Use UTF-8 text/plain." });
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid request." });
    next(error);
  });
  return router;
}
