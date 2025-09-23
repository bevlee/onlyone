export interface RoomPlayer {
  id: string;
  name: string;
  socketId?: string;
}

export enum Difficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard'
}

export enum GamePhaseType {
  Lobby = 'lobby',
  ChoosingDifficulty = 'choosing-difficulty',
  WritingClues = 'writing-clues',
  FilteringClues = 'filtering-clues',
  GuessingWord = 'guessing-word',
  EndGame = 'end-game'
}

export interface Settings {
  maxPlayers: number;
  timeLimit: number;
}

export interface BaseLobbyState {
  minPlayersToStart: number;
}

export interface BaseChoosingDifficultyState {
  availableDifficulties: Difficulty[];
  guessingPlayer: string;
}

export interface BaseWritingCluesState {
  difficulty: Difficulty;
  secretWord: string;
  clues: Clue[];
  guessingPlayer: string;
}

export interface BaseFilteringCluesState {
  difficulty: Difficulty;
  secretWord: string;
  clues: Clue[];
  dedupedClues: Clue[];
  guessingPlayer: string;
}


export interface BaseGuessingWordState {
  difficulty: Difficulty;
  secretWord: string;
  dedupedClues: Clue[];
  guess: string;
  guessingPlayer: string;
}

export interface BaseEndGameState {
  difficulty: Difficulty;
  secretWord: string;
  guess: string;
  success: boolean;
  guessingPlayer: string;

}

export interface LobbyState extends BaseLobbyState {}

export interface ChoosingDifficultyState extends BaseChoosingDifficultyState {}

export interface WritingCluesState extends BaseWritingCluesState {}

export interface FilteringCluesState extends BaseFilteringCluesState {}

export interface GuessingWordState extends BaseGuessingWordState {}

export interface EndGameState extends BaseEndGameState {

  // All clues with authors hidden until individual voting complete
  clues: Clue[]; 

  // Single commendation phase (all players including guesser)
  playerCommends: PlayerCommends;
  playerCommendHistory: {
    [playerName: string]: string[]; // track which clues each player has commended (any type)
  };
}

export type GamePhase =
  | { phase: GamePhaseType.Lobby; state: LobbyState }
  | { phase: GamePhaseType.ChoosingDifficulty; state: ChoosingDifficultyState }
  | { phase: GamePhaseType.WritingClues; state: WritingCluesState }
  | { phase: GamePhaseType.FilteringClues; state: FilteringCluesState }
  | { phase: GamePhaseType.GuessingWord; state: GuessingWordState }
  | { phase: GamePhaseType.EndGame; state: EndGameState }

export interface GameState {
  gamesWon: number;
  gamesPlayed: number;
  gamePhase: GamePhase;
}


export interface PlayerCommends {
  [clueText: string]: ClueCommends;
}

export interface ClueCommends {
  helpful: number;
  creative: number;
}

export interface Clue {
  text: string;
  submitter: string;
  votes: ClueCommends;
  wasFiltered: boolean;
  submittedAt: Date;
}

export interface CommendEvent {
  clueText: string;
  commendType: 'helpful' | 'creative';
}


export interface Room {
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  settings: Settings;
  gameState: GameState;
}

export interface Rooms {
  [roomId: string]: Room;
}

export interface GameRecord {
  id: string;
  roomId: string;
  players: RoomPlayer[];
  success: boolean;
  difficulty: Difficulty;
  startTime: Date;
  endTime: Date;
  secretWord: string;
  finalGuess: string;
  timeElapsed: number;
  clues: Clue[];
}