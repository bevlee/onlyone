import { createHash } from "node:crypto";

/** Derive a stable public ID from a private per-tab reconnect token, independent of names and sockets. */
export function playerIdFromToken(token) {
  if (
    typeof token !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    throw new Error("A valid player reconnect token is required.");
  }
  return createHash("sha256").update(token.toLowerCase()).digest("hex");
}
