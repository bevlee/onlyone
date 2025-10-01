import { screen } from '@testing-library/dom';
import { page } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

vi.mock('$env/dynamic/public', () => ({
	env: {
	  PUBLIC_SOCKET_URL: 'http://localhost:3000',
	}
  }));

describe('/+page.svelte', () => {
	it('should contain the instruction text', async () => {
		render(Page);
		screen.debug();
		const instructionText = page.getByRole('paragraph').first();
		await expect.element(instructionText).toBeInTheDocument();
	});
});
