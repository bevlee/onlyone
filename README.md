# OnlyOne Game

A cooperative multiplayer word guessing game inspired by [Just One](<https://en.wikipedia.org/wiki/Just_One_(board_game)>) with a few tweaks.

Built with Svelte frontend, Node.js backend, and containerized deployment.

## Demo

You can test the game at https://onlyone.bevsoft.com

Note: This is a multiplayer game - you'll need multiple players to enjoy the full experience!

## Architecture

- **Frontend**: Svelte application with Socket.IO client
- **Backend**: Node.js gameserver with modular architecture
- **Proxy**: Nginx reverse proxy for routing and static files
- **Deployment**: Docker Compose orchestration

## Docker Services

- **frontend-builder**: Builds Svelte application assets
- **gameserver**: Node.js backend with game logic
- **nginx**: Reverse proxy and static file server

## URLs

- **Application**: http://localhost
- **WebSocket**: http://localhost/socket.io/\*
- **Health Check**: http://localhost/health

## Deployment

### Local

/front

```bash
npm run dev
```

/gameserver

```bash
node index.js
```

### Docker Compose

1. **Build and deploy**:

   ```bash
   docker-compose up --build -d
   ```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
GAMESERVER_PORT=3000
SERVER_NAME=your-domain.com
```

## Features

### Game Mechanics

- Real-time multiplayer word guessing
- Select a difficulty level to guess a secret word from
- Collaborative clue writing with duplicate elimination
- Vote on whether clues are duplicates
- See how many you can guess right as a team

## Production releases

Production runs in the `onlyone` Kubernetes namespace, in deployment `onlyone`.
The tag workflow tests the code and publishes ARM64 and AMD64 images. The former
ECS deployment target has been retired; publishing images does not roll out Kubernetes.

After the tag workflow passes, update both containers together (replace VERSION):

```bash
kubectl -n onlyone set image deployment/onlyone nginx=docker.io/bevdev1/onlyone-nginx:VERSION gameserver=docker.io/bevdev1/onlyone-gameserver:VERSION
kubectl -n onlyone rollout status deployment/onlyone
```

The nginx container uses `GAMESERVER_HOST=127.0.0.1` because both containers share
a pod. Docker Compose defaults to the `gameserver` service hostname.

## Original word list API

Set `ORIGINAL_WORDS_API_KEY` on the game server for scripted access using
`Authorization: Bearer <key>`. Editor sessions can also access this API after
password unlocking. Without either an API key or an editor password configured,
the API returns 503. No Community submissions are provided.

- `GET /api/original-words/easy` reads the current list.
- `PUT /api/original-words/easy` **replaces** the entire list with UTF-8 `text/plain`,
  one secret word or phrase per line. Use `medium` or `hard` for the other lists.
- Responses contain `difficulty`, `count` and `words`.

For example, with the key already set in your shell environment:

```bash
curl --fail-with-body -X PUT 'https://onlyone.bevsoft.com/api/original-words/easy' \
  -H "Authorization: Bearer $ORIGINAL_WORDS_API_KEY" \
  -H 'Content-Type: text/plain; charset=utf-8' \
  --data-binary @easy-words.txt
```

Blank lines are ignored, whitespace is trimmed, and duplicates are removed
case-insensitively. Phrases stay together. Each list must contain 1–10,000 distinct
entries, each at most 60 characters; uploads are limited to 1 MB. Control characters
and angle brackets are rejected. Invalid requests do not change the existing list.

Updates apply to subsequent word selections, including later rounds in an active
game; a round's selected secret word stays unchanged. Repeating an identical PUT
has the same effect as sending it once.

`ORIGINAL_WORDS_PATH` controls where overrides are saved, defaulting to
`gameserver/data/original-word-lists.json` (`/app/data/original-word-lists.json` in
the container). All three lists are saved atomically before an update takes effect.
The built-in lists are used until an override file exists. Kubernetes production
uses the `onlyone-word-lists` persistent volume at `/app/persistent`, with
`ORIGINAL_WORDS_PATH=/app/persistent/original-word-lists.json`, so edits survive
pod replacement and redeployment. Keep a single server instance for this file
store. The deployment uses Recreate to prevent overlapping writers.

## Word list editor

Open `/words` and enter the shared password to unlock Original words. Select Easy, Medium or Hard;
use Add or Remove to save each change immediately. At least one word must remain
in each difficulty. Changes from other editors are preserved by individual add
and remove operations, rather than submitting a stale copy of the whole list.

Set `ORIGINAL_WORDS_ADMIN_PASSWORD` on the game server to enable shared-password
unlocking. The password stays on the server; editor sessions use HttpOnly,
SameSite=Strict cookies and expire after eight hours, or when the server restarts.
No account or sign-in/sign-out controls are needed. Production cookies require HTTPS. The existing
API key continues to work for scripted requests independently of editor sessions.

For local development, `npm start` in `gameserver` loads the optional, gitignored
`.env.local` file. Deployment must provide the password through the server's
environment; that local file is excluded from container images. The editor uses
the same persistent storage setting as the API described above.

The Kubernetes storage definition and deployment patch are in
`kubernetes/word-lists-pvc.yaml` and `kubernetes/word-editor-patch.yaml`. The patch
references the `onlyone-word-editor` Secret; supply its
`ORIGINAL_WORDS_ADMIN_PASSWORD` key separately. Never commit the password into
the deployment manifest.
