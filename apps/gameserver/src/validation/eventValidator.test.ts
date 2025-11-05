// apps/gameserver/src/validation/eventValidator.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateClientEvent,
  validateChatMessage,
  ValidationError,
} from './eventValidator';

describe('Event Validator', () => {
  describe('validateClientEvent', () => {
    it('validates a valid StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result).toEqual(action);
    });

    it('throws ValidationError for invalid action type', () => {
      const action = {
        type: 'InvalidType',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow(ValidationError);
    });

    it('throws ValidationError with detailed error message', () => {
      const action = {
        type: 'SubmitClue',
        clueText: '', // empty clue text is invalid
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      try {
        validateClientEvent(action);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toContain('clueText');
        }
      }
    });

    it('throws ValidationError for missing matchId', () => {
      const action = {
        type: 'StartGame',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow(ValidationError);
    });
  });

  describe('validateChatMessage', () => {
    it('validates a valid chat message', () => {
      const message = 'Hello world!';
      const result = validateChatMessage(message);
      expect(result).toBe('Hello world!');
    });

    it('throws ValidationError for empty message', () => {
      const message = '';
      expect(() => validateChatMessage(message)).toThrow(ValidationError);
    });

    it('throws ValidationError for message too long', () => {
      const message = 'a'.repeat(1001);
      expect(() => validateChatMessage(message)).toThrow(ValidationError);
    });

    it('trims whitespace from valid message', () => {
      const message = '  hello  ';
      const result = validateChatMessage(message);
      expect(result).toBe('hello');
    });
  });
});
