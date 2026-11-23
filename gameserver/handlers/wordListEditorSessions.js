import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";

const digest = (value) => createHash("sha256").update(value).digest();
const cookieName = "onlyone_word_editor";
const lifetime = 8 * 60 * 60 * 1000;

/** Shared-password editor login with expiring, server-side sessions. */
export function createWordListEditorSessions({ password, secureCookies }) {
  const router = express.Router();
  const sessions = new Map();
  const expectedPassword = password ? digest(password) : null;
  let failedLogins = [];
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies,
    path: "/api/original-words",
  };
  const tokenFor = (req) =>
    req
      .get("Cookie")
      ?.match(/(?:^|;\s*)onlyone_word_editor=([a-f0-9]{64})(?:;|$)/)?.[1];
  const isAuthenticated = (req) => {
    const token = tokenFor(req);
    const expiresAt = sessions.get(token);
    if (!expiresAt || expiresAt <= Date.now()) {
      sessions.delete(token);
      return false;
    }
    return req.get("X-Word-List-Editor") === "1";
  };
  router.all("/session", (req, res, next) => {
    if (req.get("X-Word-List-Editor") !== "1")
      return res
        .status(403)
        .json({ error: "Use the word list editor to sign in." });
    next();
  });
  router.get("/session", (req, res) =>
    res.json({ authenticated: isAuthenticated(req) }),
  );
  router.post("/session", express.json({ limit: "2kb" }), (req, res) => {
    if (!expectedPassword)
      return res
        .status(503)
        .json({ error: "Word list editor is not configured." });
    const now = Date.now();
    failedLogins = failedLogins.filter((time) => time > now - 60000);
    if (failedLogins.length >= 10) {
      res.set("Retry-After", "60");
      return res
        .status(429)
        .json({ error: "Too many attempts. Try again in a minute." });
    }
    if (
      typeof req.body?.password !== "string" ||
      !timingSafeEqual(digest(req.body.password), expectedPassword)
    ) {
      failedLogins.push(now);
      return res.status(401).json({ error: "Incorrect password." });
    }
    for (const [token, expiresAt] of sessions)
      if (expiresAt <= now) sessions.delete(token);
    sessions.delete(tokenFor(req));
    if (sessions.size >= 256) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString("hex");
    sessions.set(token, now + lifetime);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
    res.json({ authenticated: true });
  });
  router.delete("/session", (req, res) => {
    sessions.delete(tokenFor(req));
    res.clearCookie(cookieName, cookieOptions);
    res.json({ authenticated: false });
  });
  return { router, isAuthenticated };
}
