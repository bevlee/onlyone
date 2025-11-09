import { describe, it, expect, vi } from 'vitest';
import { validateChatMessage, validateClientEvent } from '../../src/validation/eventValidator';

describe('Socket Handlers - Chat Message Validation', () => {
  it('rejects empty chat messages', () => {
    expect(() => validateChatMessage('')).toThrow();
  });

  it('accepts valid chat messages', () => {
    const result = validateChatMessage('Hello world');
    expect(result).toBe('Hello world');
  });

  it('trims whitespace from valid messages', () => {
    const result = validateChatMessage('  message  ');
    expect(result).toBe('message');
  });
});

describe('Socket Handlers - Game Action Validation', () => {
  it('rejects game action with invalid matchId', () => {
    const action = {
      type: 'SubmitClue',
      clueText: 'test',
      matchId: 'not-a-uuid', // invalid
      playerId: 'player-1',
      timestamp: new Date().toISOString(),
    };
    expect(() => validateClientEvent(action)).toThrow();
  });

  it('accepts valid SubmitClue action', () => {
    const action = {
      type: 'SubmitClue',
      clueText: 'test clue',
      matchId: '123e4567-e89b-12d3-a456-426614174000',
      playerId: 'player-1',
      timestamp: new Date().toISOString(),
    };
    const result = validateClientEvent(action);
    expect(result.type).toBe('SubmitClue');
  });

  describe('StartGame action', () => {
    it('validates a valid StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result.type).toBe('StartGame');
    });

    it('rejects StartGame without matchId', () => {
      const action = {
        type: 'StartGame',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });

    it('rejects StartGame with empty playerId', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: '',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });
  });

  describe('SubmitWords action', () => {
    it('validates a valid SubmitWords action', () => {
      const action = {
        type: 'SubmitWords',
        word: 'elephant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result.type).toBe('SubmitWords');
    });

    it('rejects SubmitWords with empty word', () => {
      const action = {
        type: 'SubmitWords',
        word: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });

    it('rejects SubmitWords with word longer than 100 chars', () => {
      const action = {
        type: 'SubmitWords',
        word: 'a'.repeat(101),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });
  });

  describe('SubmitClue action', () => {
    it('validates a valid SubmitClue action', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'large animal from Africa',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result.type).toBe('SubmitClue');
    });

    it('rejects SubmitClue with empty clueText', () => {
      const action = {
        type: 'SubmitClue',
        clueText: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });

    it('rejects SubmitClue with clueText longer than 500 chars', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'a'.repeat(501),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });
  });

  describe('VoteOnClue action', () => {
    it('validates a valid VoteOnClue action', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: 'large animal',
        vote: 'keep',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result.type).toBe('VoteOnClue');
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
      expect(() => validateClientEvent(action)).toThrow();
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
      expect(() => validateClientEvent(action)).toThrow();
    });
  });

  describe('SubmitGuess action', () => {
    it('validates a valid SubmitGuess action', () => {
      const action = {
        type: 'SubmitGuess',
        guess: 'elephant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result.type).toBe('SubmitGuess');
    });

    it('rejects SubmitGuess with empty guess', () => {
      const action = {
        type: 'SubmitGuess',
        guess: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });

    it('rejects SubmitGuess with guess longer than 100 chars', () => {
      const action = {
        type: 'SubmitGuess',
        guess: 'a'.repeat(101),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });
  });

  describe('CommendClue action', () => {
    it('validates a valid CommendClue action', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        commendType: 'helpful',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result.type).toBe('CommendClue');
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
      expect(() => validateClientEvent(action)).toThrow();
    });

    it('rejects CommendClue with missing commendType', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });
  });

  describe('Invalid event types', () => {
    it('rejects invalid event type', () => {
      const action = {
        type: 'InvalidEvent',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow();
    });

    it('rejects action missing required base fields', () => {
      const action = {
        type: 'StartGame',
        // missing matchId, playerId, timestamp
      };
      expect(() => validateClientEvent(action)).toThrow();
    });
  });
});
