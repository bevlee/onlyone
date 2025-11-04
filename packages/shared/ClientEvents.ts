/**
 * Client Events - Action types sent FROM client TO server
 * These represent user requests that trigger game state transitions
 */

/**
 * Base structure for all client game actions
 */
export interface BaseClientEvent {
  matchId: string;
  playerId: string;
  timestamp: Date;
}

/**
 * Client initiates game start (transitions from lobby word collection to first round)
 */
export interface StartGameAction extends BaseClientEvent {
  type: 'StartGame';
}

/**
 *  requests to submit their word during lobby phase
 */
export interface SubmitWordAction extends BaseClientEvent {
  type: 'SubmitWords';
  word: string;
}

/**
 * Client submits a clue during WritingClues phase
 */
export interface SubmitClueAction extends BaseClientEvent {
  type: 'SubmitClue';
  clueText: string;
}

/**
 * Client votes on a clue during FilteringClues phase
 */
export interface VoteOnClueAction extends BaseClientEvent {
  type: 'VoteOnClue';
  clueText: string;
  vote: 'keep' | 'remove';
}

/**
 * Client submits their guess during GuessingWord phase
 * Only the guessingPlayer should emit this
 */
export interface SubmitGuessAction extends BaseClientEvent {
  type: 'SubmitGuess';
  guess: string;
}

/**
 * Client commends a clue during EndGame phase
 */
export interface CommendClueAction extends BaseClientEvent {
  type: 'CommendClue';
  clueText: string;
  commendType: 'helpful' | 'creative';
}

/**
 * All possible client-initiated game actions
 */
export type ClientEvent =
  | StartGameAction
  | SubmitWordAction
  | SubmitClueAction
  | VoteOnClueAction
  | SubmitGuessAction
  | CommendClueAction;

/**
 * Extension to ClientToServerEvents for Socket.IO typing
 * Add this to SocketEvents.ts ClientToServerEvents interface:
 *
 * Action: (action: ClientEvent) => void;
 */
