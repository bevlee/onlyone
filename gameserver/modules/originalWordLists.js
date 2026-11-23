import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { difficulties } from "../data/data.js";

/** Parse newline-delimited secret words, retaining the first spelling of each word. */
export function parseOriginalWords(text) {
  const words = new Map();
  for (const line of text.split(/\r\n|\n|\r/)) {
    const word = line.trim().replace(/ +/g, " ");
    if (!word) continue;
    if (word.length > 60 || /[\x00-\x1f\x7f<>]/.test(word)) {
      throw new RangeError(
        "Each secret word must be 1–60 characters without control characters or angle brackets.",
      );
    }
    const key = word.toLowerCase();
    if (!words.has(key)) words.set(key, word);
  }
  if (!words.size || words.size > 10000) {
    throw new RangeError("Provide between 1 and 10,000 distinct secret words.");
  }
  return [...words.values()];
}

/** Persistent Original lists, shared with the game loop for future word selections. */
export class OriginalWordLists {
  constructor({ filePath, defaults }) {
    this.filePath = filePath;
    this.words = Object.fromEntries(
      difficulties.map((difficulty) => [difficulty, [...defaults[difficulty]]]),
    );
    let saved;
    try {
      saved = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const difficulty of difficulties) {
      if (
        !Array.isArray(saved?.[difficulty]) ||
        saved[difficulty].some(
          (word) => typeof word !== "string" || /[\r\n]/.test(word),
        )
      ) {
        throw new Error(`Invalid saved Original list: ${difficulty}`);
      }
      this.words[difficulty] = parseOriginalWords(saved[difficulty].join("\n"));
    }
  }

  /** Persist the complete replacement atomically before exposing it to games. */
  replace(difficulty, words) {
    const next = { ...this.words, [difficulty]: words };
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporaryPath, JSON.stringify(next, null, 2) + "\n", {
        mode: 0o600,
      });
      renameSync(temporaryPath, this.filePath);
    } finally {
      rmSync(temporaryPath, { force: true });
    }
    this.words[difficulty] = words;
  }
}
