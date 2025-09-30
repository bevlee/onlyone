NATS jetstream: Stores and streams game events in a durable, format for post match replays.

nodejs: Hosts your game server logic, APIs, and manages room state and player interactions.

Socket.IO: Enables real-time bidirectional communication between clients and the game server over WebSockets.

SQLite: Stores match summaries, player stats, and other structured data for fast querying and persistence.

Nginx: Acts as a reverse proxy to route traffic to your backend, serve static assets, and handle SSL termination.

## Event-Driven Architecture Summary

This redesign transforms the OnlyOne game server from a stateful, imperative model to an event-sourced architecture where every game action becomes an immutable event stored in NATS Jetstream's distributed log. Instead of directly modifying game state through methods like `setSecretWord()` or `addClue()`, the system will emit events such as `SecretWordSelected`, `ClueSubmitted`, and `GuessAttempted` that are persisted to NATS Jetstream topics partitioned by room ID. The Node.js game server subscribes to these event streams to reconstruct current game state in real-time, while SQLite maintains materialized views of game summaries for fast queries. This approach enables powerful replay capabilities where any game can be reconstructed from its event log, supporting features like step-by-step replay, alternative timeline exploration ("what if different clues were chosen?"), post-game analysis, and robust crash recovery since game state can always be rebuilt from the durable event log.

The frontend will be restructured to use SvelteKit's file-based routing where each game room becomes a separate route (e.g., `/room/[roomName]`), replacing the current single-page component approach with proper URL-based navigation. This enables shareable room links, browser history navigation, and better SEO while maintaining real-time Socket.IO connectivity within each room route.
