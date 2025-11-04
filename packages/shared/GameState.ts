
import { GameEvent } from './GameEvent.js';
import { Player } from './Player.js';


export interface GameState {
  matchId: string;
  gamesWon: number;
  gamesPlayed: number;
  gamePhase: GamePhase;
  currentRoundIndex: number;
  wordPool: WordSubmission[];
  events: GameEvent[];
  eventCount: number;
}


export interface WordSubmission {
  word: string;
  submittedBy: string;
  submittedAt: Date;
  used: boolean;
}

export interface BaseSecretWordWritingState {
  submissions: Map<string, string>; // playerName -> their submitted word (hidden)
}

export interface BaseWritingCluesState {
  secretWord: string;
  clues: Clue[];
  guessingPlayerId: string;
  guessingPlayerName: string;
  wordSubmitterId: string;
  wordSubmitterName: string;
  submittedBy: Set<string>;
  roundIndex: number;
}

export interface BaseFilteringCluesState {
  secretWord: string;
  clues: Clue[];
  dedupedClues: Clue[];
  guessingPlayerId: string;
  guessingPlayerName: string;
  wordSubmitterId: string;
  wordSubmitterName: string;
  votes: Map<string, { keep: number; remove: number; voters: Set<string> }>;
  roundIndex: number;
}


export interface BaseGuessingWordState {
  secretWord: string;
  dedupedClues: Clue[];
  guess: string;
  guessingPlayerId: string;
  guessingPlayerName: string;
  wordSubmitterId: string;
  wordSubmitterName: string;
  guessSubmitted: boolean;
  roundIndex: number;
}

export interface BaseEndRoundState {
  secretWord: string;
  guess: string;
  success: boolean;
  guessingPlayerId: string;
  guessingPlayerName: string;
  wordSubmitterId: string;
  wordSubmitterName: string;
  clues: Clue[];
  roundIndex: number;
}
export interface BaseEndGameState {
  gamesWon: number;
  gameesPlayed: number;
}


export enum GamePhaseType {
  SecretWordWriting = 'secret-word-writing',
  WritingClues = 'writing-clues',
  FilteringClues = 'filtering-clues',
  GuessingWord = 'guessing-word',
  EndRound = 'end-round',
  EndGame = 'end-game'
}

export interface SecretWordWritingState extends BaseSecretWordWritingState {}

export interface WritingCluesState extends BaseWritingCluesState {}

export interface FilteringCluesState extends BaseFilteringCluesState {}

export interface GuessingWordState extends BaseGuessingWordState {}

export interface EndRoundState extends BaseEndRoundState {}

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
  | { phase: GamePhaseType.SecretWordWriting; state: SecretWordWritingState }
  | { phase: GamePhaseType.WritingClues; state: WritingCluesState }
  | { phase: GamePhaseType.FilteringClues; state: FilteringCluesState }
  | { phase: GamePhaseType.GuessingWord; state: GuessingWordState }
  | { phase: GamePhaseType.EndRound; state: EndRoundState }
  | { phase: GamePhaseType.EndGame; state: EndGameState }




export interface PlayerCommends {
  [clueText: string]: ClueCommends;
}

export interface ClueCommends {
  helpful: number;
  creative: number;
}

export interface Clue {
  text: string;
  submitterId: string;
  submitterName: string;
  votes: ClueCommends;
  wasFiltered: boolean;
  nonDuplicate: boolean;
  submittedAt: Date;
}

export interface CommendEvent {
  clueText: string;
  commendType: 'helpful' | 'creative';
}




export interface GameRecord {
  id: string;
  roomName: string;
  players: Player[];
  success: boolean;
  startTime: Date;
  endTime: Date;
  secretWord: string;
  finalGuess: string;
  timeElapsed: number;
  clues: Clue[];
}