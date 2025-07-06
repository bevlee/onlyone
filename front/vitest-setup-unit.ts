import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';
afterEach(() => {
  cleanup();
});

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_SOCKET_URL: 'http://localhost:3000',
    PUBLIC_API_URL: 'http://localhost:3000/api'
  }
}));