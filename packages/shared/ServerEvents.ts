/**
 * Server Events - Event types emitted FROM server TO clients
 * These represent game state transitions and state broadcasts
 */

import { GamePhase, GamePhaseType } from './GameState.js';
import type { Room } from './Room.js';

/**
 * Base structure for all server game events
 */
export interface BaseServerEvent {
  matchId: string;
  timestamp: Date;
}

/**
 * Emitted when SecretWordWriting phase begins
 */
export interface SecretWordWritingStartedEvent extends BaseServerEvent {
  type: 'SecretWordWritingStarted';
  gamePhase: GamePhase & { phase: GamePhaseType.SecretWordWriting };
}

/**
 * Emitted when a player submits their secret word
 */
export interface SecretWordSubmittedEvent extends BaseServerEvent {
  type: 'SecretWordSubmitted';
  submitterId: string;
  submitterName: string;
}

/**
 * Emitted when SecretWordWriting phase ends and WritingClues begins for round
 */
export interface WritingCluesStartedEvent extends BaseServerEvent {
  type: 'WritingCluesStarted';
  gamePhase: GamePhase & { phase: GamePhaseType.WritingClues };
}

/**
 * Emitted when a clue is submitted during WritingClues phase
 * All clients see who submitted what clue
 */
export interface ClueSubmittedEvent extends BaseServerEvent {
  type: 'ClueSubmitted';
  clueText: string;
  submitterId: string;
  roundIndex: number;
}

/**
 * Emitted when WritingClues phase ends and FilteringClues begins
 */
export interface FilteringCluesStartedEvent extends BaseServerEvent {
  type: 'FilteringCluesStarted';
  gamePhase: GamePhase & { phase: GamePhaseType.FilteringClues };
}


/**
 * Emitted when a player votes on a clue
 * All clients see the vote counts update in real-time
 */
export interface ClueVotedEvent extends BaseServerEvent {
  type: 'ClueVoted';
  clueText: string;
  voterId: string;
  vote: 'keep' | 'remove';
  keepCount: number;
  removeCount: number;
  roundIndex: number;
}

/**
 * Emitted when FilteringClues phase ends and GuessingWord begins
 * All players get full game state; writers see all clues, guesser sees dedupedClues
 */
export interface GuessingWordStartedEvent extends BaseServerEvent {
  type: 'GuessingWordStarted';
  gamePhase: GamePhase & { phase: GamePhaseType.GuessingWord };
}

/**
 * Emitted when the guesser submits their guess
 * All players see the guess and whether it's correct
 */
export interface GuessSubmittedEvent extends BaseServerEvent {
  type: 'GuessSubmitted';
  guess: string;
  guessingPlayerId: string;
  isCorrect: boolean;
  secretWord: string; // revealed after guess
  roundIndex: number;
}

/**
 * Emitted when a round ends (guess submitted, moving to EndGame)
 * Contains all round results
 */
export interface EndRoundEvent extends BaseServerEvent {
  type: 'EndRound';
  secretWord: string;
  finalGuess: string;
  success: boolean;
  guessingPlayerId: string;
  wordSubmitterId: string;
  clues: Array<{
    text: string;
    submitterId: string;
    submitterName: string;
  }>;
  roundIndex: number;
}

/**
 * Emitted when a player commends a clue during EndGame phase
 * All players see commendations in real-time
 */
export interface ClueCommendedEvent extends BaseServerEvent {
  type: 'ClueCommended';
  clueText: string;
  commendType: 'helpful' | 'creative';
  commenderId: string;
  commenderName: string;
  helpfulCount: number;
  creativeCount: number;
}

/**
 * Emitted when all words have been played and game is complete
 * Contains final game statistics
 */
export interface GameCompletedEvent extends BaseServerEvent {
  type: 'GameCompleted';
  totalRounds: number;
  gamesWon: number;
  gamesPlayed: number;
}

/**
 * Generic game state event - sent when game state needs full sync
 * Used for reconnects or state initialization
 */
export interface GameStateEvent extends BaseServerEvent {
  type: 'GameState';
  room: Room;
}

/**
 * All possible server-emitted game events
 */
export type ServerEvent =
  | SecretWordWritingStartedEvent
  | SecretWordSubmittedEvent
  | WritingCluesStartedEvent
  | ClueSubmittedEvent
  | FilteringCluesStartedEvent
  | ClueVotedEvent
  | GuessingWordStartedEvent
  | GuessSubmittedEvent
  | EndRoundEvent
  | ClueCommendedEvent
  | GameCompletedEvent
  | GameStateEvent;

/**
 * Extension to ServerToClientEvents for Socket.IO typing
 * Add this to SocketEvents.ts ServerToClientEvents interface:
 *
 * Event: (event: ServerEvent) => void;
 */
