// Test setup file - runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console logs during tests (optional)
// console.log = () => {};
// console.warn = () => {};

// Global test timeout
const originalTimeout = setTimeout;
global.setTimeout = (fn: any, delay: number) => {
  if (delay > 5000) {
    throw new Error('Test timeout too long. Keep tests under 5 seconds.');
  }
  return originalTimeout(fn, delay);
};

// Clean up after tests
process.on('exit', () => {
  // Add any cleanup logic here
  console.log('Test suite completed');
});

export {};