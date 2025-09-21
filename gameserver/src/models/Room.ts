export interface Player {
  id: string;
  name: string;
  socketId?: string;
}

export enum Difficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard'
}

export interface Settings {
  maxPlayers: number;
  timeLimit: number;
}

export interface BasePhaseState {
  phaseStartTime: Date;
  timeLimit: number;
}

export interface BaseChoosingDifficultyState extends BasePhaseState {
  availableDifficulties: Difficulty[];
}

export interface BaseWritingCluesState extends BasePhaseState {
  difficulty: Difficulty;
  secretWord: string;
  clues: string[];
}

export interface BaseFilteringCluesState extends BasePhaseState {
  difficulty: Difficulty;
  secretWord: string;
  clues: string[];
  dedupedClues: string[];
}

export interface BaseGuessingWordState extends BasePhaseState {
  difficulty: Difficulty;
  secretWord: string;
  dedupedClues: string[];
  guess: string;
}

export interface BaseEndGameState extends BasePhaseState {
  difficulty: Difficulty;
  secretWord: string;
  guess: string;
  gamesWon: number;
  gamesPlayed: number;
  totalRounds: number;
}

export interface ChoosingDifficultyState extends BaseChoosingDifficultyState {}

export interface WritingCluesState extends BaseWritingCluesState {}

export interface FilteringCluesState extends BaseFilteringCluesState {}

export interface GuessingWordState extends BaseGuessingWordState {}

export interface EndGameState extends BaseEndGameState {}

export type GamePhase =
  | { phase: 'choosing-difficulty'; state: ChoosingDifficultyState }
  | { phase: 'writing-clues'; state: WritingCluesState }
  | { phase: 'filtering-clues'; state: FilteringCluesState }
  | { phase: 'guessing-word'; state: GuessingWordState }
  | { phase: 'end-game'; state: EndGameState }

export interface GameState {
  currentRound: number;
  currentGuesser: string;
  gamePhase: GamePhase;
}

export interface Room {
  players: Player[];
  spectators: Player[];
  settings: Settings;
  gameState: GameState;
}

export interface Rooms {
  [roomId: string]: Room;
}

export interface GameRecord {
  id: string;
  roomId: string;
  players: string[];
  spectators: string[];
  winner: string;
  difficulty: Difficulty;
  rounds: number;
  startTime: Date;
  endTime: Date;
  secretWord: string;
  finalGuess: string;
  cluesSubmitted: string[];
  cluesFiltered: string[];
  timeElapsed: number;
}