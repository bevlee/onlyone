export interface RoomPlayer {
  id: string;
  name: string;
  socketId?: string;
}

// Helper function to identify anonymous players
export function isAnonymousPlayer(playerId: string): boolean {
  return playerId.startsWith('anon_');
}


export enum GamePhaseType {
  Lobby = 'lobby',
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


export interface BaseWritingCluesState {
  secretWord: string;
  clues: Clue[];
  guessingPlayer: string;
}

export interface BaseFilteringCluesState {
  secretWord: string;
  clues: Clue[];
  dedupedClues: Clue[];
  guessingPlayer: string;
}


export interface BaseGuessingWordState {
  secretWord: string;
  dedupedClues: Clue[];
  guess: string;
  guessingPlayer: string;
}

export interface BaseEndGameState {
  secretWord: string;
  guess: string;
  success: boolean;
  guessingPlayer: string;
}

export interface LobbyState extends BaseLobbyState {}


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
  nonDuplicate: boolean;
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
  roomLeader: string;
}

export interface Rooms {
  [roomId: string]: Room;
}

import { Player } from './Player.js';

export interface GameRecord {
  id: string;
  roomId: string;
  players: Player[];
  success: boolean;
  startTime: Date;
  endTime: Date;
  secretWord: string;
  finalGuess: string;
  timeElapsed: number;
  clues: Clue[];
}