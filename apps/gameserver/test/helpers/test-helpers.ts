import { expect } from 'vitest';
import { Response } from 'supertest';

/**
 * Helper function to verify JSON response structure
 */
export const expectJsonResponse = (response: Response) => {
  expect(response.headers['content-type']).to.match(/application\/json/);
  expect(response.body).to.be.an('object');
};

/**
 * Helper function to verify successful API response
 */
export const expectSuccessResponse = (response: Response, expectedStatus = 200) => {
  expect(response.status).to.equal(expectedStatus);
  expectJsonResponse(response);
};

/**
 * Helper function to verify error response structure
 */
export const expectErrorResponse = (response: Response, expectedStatus = 400) => {
  expect(response.status).to.equal(expectedStatus);
  expectJsonResponse(response);
  expect(response.body).to.have.property('error');
  expect(response.body.error).to.be.a('string');
};

/**
 * Helper function to create mock room data
 */
export const createMockRoom = (overrides: any = {}) => ({
  id: 'test-room-id',
  name: 'Test Room',
  players: [],
  status: 'waiting',
  maxPlayers: 4,
  ...overrides
});

/**
 * Helper function to create mock user data
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

/**
 * Helper to measure execution time
 */
export const measureExecutionTime = async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  const duration = endTime - startTime;

  return { result, duration };
};