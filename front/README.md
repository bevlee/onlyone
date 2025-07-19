# OnlyOne - Multiplayer Word Guessing Game

A real-time multiplayer word guessing game inspired by the board game "Just One". Players work together as a team to guess secret words through collaborative clue-giving.

## How to Play

1. **Join a Room**: Enter a room name to join or create a new game room
2. **Team Setup**: One player becomes the "guesser" while others become "writers"
3. **Category Selection**: The guesser chooses a category (animals, people, places)
4. **Secret Word**: Writers see the secret word and write one-word clues to help the guesser
5. **Duplicate Filtering**: Any duplicate clues are automatically cancelled out
6. **Guessing**: The guesser sees the filtered clues and tries to guess the word
7. **Scoring**: The team wins if the guesser correctly identifies the word

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
npm run dev -- --open
```

### Building for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 🛠️ Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Real-time Communication**: Socket.IO
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Vitest for unit tests, Playwright for E2E tests

## �� Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test
```

## 🌐 Deployment

The app is designed to work with a Socket.IO backend server. Make sure to:

1. Set the `PUBLIC_SOCKET_ENDPOINT` environment variable
2. Deploy the backend server (see `/back` directory)
3. Configure CORS settings for your domain

## �� Features

- **Real-time Multiplayer**: Instant updates across all connected players
- **Room-based Gameplay**: Join specific rooms for private games
- **Role-based Interface**: Different UI for guessers vs writers
- **Automatic Duplicate Detection**: Smart filtering of duplicate clues
- **Timer System**: Time limits for each game phase
- **Score Tracking**: Track games won vs games played
- **Responsive Design**: Works on desktop and mobile devices

## 🔧 Development

### Environment Variables

- `PUBLIC_SOCKET_ENDPOINT`: WebSocket server endpoint that connects to the game server

### Key Components

- **Room.svelte**: Main game orchestrator handling Socket.IO events
- **Game Flow**: chooseCategory → writeClues → filterClues → guessWord → endGame
- **State Management**: Uses Svelte's reactive state for real-time updates

## 📝 License

This project is open source and available under the MIT License.
