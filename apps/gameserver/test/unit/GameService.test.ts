import { describe, it, expect } from 'vitest';
import { GameService } from '../../src/services/GameService';
import { GamePhaseType, SecretWordWritingState, SubmitWordAction } from '@onlyone/shared';

describe('GameService', () => {
  describe('createInitialGameState', () => {
    it('should create a new game in the SecretWordWriting phase', () => {
      const gameState = GameService.createInitialGameState();

      expect(gameState.gamePhase.phase).toBe(GamePhaseType.SecretWordWriting);
      const secretWordState = gameState.gamePhase.state as SecretWordWritingState;
      expect(secretWordState.submissions).toBeDefined();
      expect(gameState.gamesWon).toBe(0);
      expect(gameState.gamesPlayed).toBe(0);
      expect(gameState.eventCount).toBe(0);
      expect(gameState.events).toBe([]);
    });
  });

  describe('SecretWordWriting phase', () => {
    it('should accept a valid wordSubmission event from a user to the SecretWordWriting phase', () => {
      const MATCH_ID = "123abc"
      const PLAYER_ID = "123abc"
      const gameState = GameService.createInitialGameState({matchId: MATCH_ID});

      // Verify initial state
      expect(gameState.gamePhase.phase).toBe(GamePhaseType.SecretWordWriting);
      const secretWordState = gameState.gamePhase.state as SecretWordWritingState;
      expect(secretWordState.submissions).toBeDefined();


      const WORD = "llama";
      // Create a StartGame event
      const submitWordEvent: SubmitWordAction = {
          type: 'SubmitWords',
          word: WORD,
          matchId: MATCH_ID, 
          playerId: PLAYER_ID, 
          timestamp: new Date()
      };

      // Apply the event
      GameService.applyEvent(gameState, submitWordEvent);

      expect(gameState.gamePhase.phase).toBe(GamePhaseType.SecretWordWriting);
      expect(secretWordState.submissions).toBe({
        PLAYER_ID: WORD
      });

      expect(gameState.eventCount).toBe(1);
      expect(gameState.events).toBe([submitWordEvent]);

    });

    it('should accept 8 sequential wordSubmission events', () => {
      const MATCH_ID = "123abc"
      const gameState = GameService.createInitialGameState({matchId: MATCH_ID});
      // Verify initial state
      expect(gameState.gamePhase.phase).toBe(GamePhaseType.SecretWordWriting);
      const secretWordState = gameState.gamePhase.state as SecretWordWritingState;
      expect(secretWordState.submissions).toBeDefined();

      const submitEvents: SubmitWordAction[] = [];
      const expectedSubmissions: Record<string, string> = {};

      // Create and apply 8 word submission events
      for (let i = 0; i < 8; i++) {
        const PLAYER_ID = `player-${i}`;
        const WORD = `word${i}`;

        const submitWordEvent: SubmitWordAction = {
          type: 'SubmitWords',
          word: WORD,
          matchId: MATCH_ID,
          playerId: PLAYER_ID,
          timestamp: new Date()
        };

        submitEvents.push(submitWordEvent);
        expectedSubmissions[PLAYER_ID] = WORD;
        GameService.applyEvent(gameState, submitWordEvent);
      }

      expect(gameState.gamePhase.phase).toBe(GamePhaseType.SecretWordWriting);
      expect(secretWordState.submissions).toEqual(expectedSubmissions);
      expect(gameState.eventCount).toBe(8);
      expect(gameState.events).toEqual(submitEvents);
    });

  });
});
