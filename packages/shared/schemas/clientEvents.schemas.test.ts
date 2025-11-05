// packages/shared/schemas/clientEvents.schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  startGameActionSchema,
  submitWordActionSchema,
  submitClueActionSchema,
  voteOnClueActionSchema,
  submitGuessActionSchema,
  commendClueActionSchema,
  clientEventSchema,
} from './clientEvents.schemas';

describe('Client Event Schemas', () => {
  describe('startGameActionSchema', () => {
    it('validates a valid StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = startGameActionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('StartGame');
      }
    });

    it('rejects StartGame without matchId', () => {
      const action = {
        type: 'StartGame',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = startGameActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects StartGame with empty playerId', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: '',
        timestamp: new Date().toISOString(),
      };
      const result = startGameActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('submitWordActionSchema', () => {
    it('validates a valid SubmitWords action', () => {
      const action = {
        type: 'SubmitWords',
        word: 'elephant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitWordActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects SubmitWords with empty word', () => {
      const action = {
        type: 'SubmitWords',
        word: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitWordActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects SubmitWords with word longer than 100 chars', () => {
      const action = {
        type: 'SubmitWords',
        word: 'a'.repeat(101),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitWordActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('submitClueActionSchema', () => {
    it('validates a valid SubmitClue action', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'large animal from Africa',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitClueActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects SubmitClue with empty clueText', () => {
      const action = {
        type: 'SubmitClue',
        clueText: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects SubmitClue with clueText longer than 500 chars', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'a'.repeat(501),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('voteOnClueActionSchema', () => {
    it('validates a valid VoteOnClue action', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: 'large animal',
        vote: 'keep',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = voteOnClueActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects VoteOnClue with invalid vote value', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: 'large animal',
        vote: 'maybe',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = voteOnClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects VoteOnClue with empty clueText', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: '',
        vote: 'keep',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = voteOnClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('submitGuessActionSchema', () => {
    it('validates a valid SubmitGuess action', () => {
      const action = {
        type: 'SubmitGuess',
        guess: 'elephant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitGuessActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects SubmitGuess with empty guess', () => {
      const action = {
        type: 'SubmitGuess',
        guess: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitGuessActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects SubmitGuess with guess longer than 100 chars', () => {
      const action = {
        type: 'SubmitGuess',
        guess: 'a'.repeat(101),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitGuessActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('commendClueActionSchema', () => {
    it('validates a valid CommendClue action', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        commendType: 'helpful',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = commendClueActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects CommendClue with invalid commendType', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        commendType: 'brilliant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = commendClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects CommendClue with missing commendType', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = commendClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('clientEventSchema (discriminated union)', () => {
    it('accepts and correctly types a StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('StartGame');
      }
    });

    it('accepts and correctly types a SubmitClue action', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'hint',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('SubmitClue');
      }
    });

    it('rejects invalid event type', () => {
      const action = {
        type: 'InvalidEvent',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects action missing required base fields', () => {
      const action = {
        type: 'StartGame',
        // missing matchId, playerId, timestamp
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });
});
