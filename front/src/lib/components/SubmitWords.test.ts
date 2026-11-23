import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SubmitWords from './SubmitWords.svelte';

const renderForm = () => {
	const onSubmit = vi.fn().mockResolvedValue({ success: true });
	render(SubmitWords, { submitted: 0, total: 3, deadlineAt: Date.now() + 60000, onSubmit });
	return onSubmit;
};

describe('SubmitWords', () => {
	afterEach(cleanup);

	it('starts with one secret word field', () => {
		renderForm();
		expect(screen.getAllByLabelText(/^Secret word \d$/)).toHaveLength(1);
		expect(screen.getByRole('button', { name: 'Add another secret word' })).toBeTruthy();
	});

	it('adds fields up to three, then hides the add button', async () => {
		renderForm();
		const add = screen.getByRole('button', { name: 'Add another secret word' });
		await fireEvent.click(add);
		await fireEvent.click(add);
		expect(screen.getAllByLabelText(/^Secret word \d$/)).toHaveLength(3);
		expect(screen.queryByRole('button', { name: 'Add another secret word' })).toBeNull();
		expect(document.activeElement?.id).toBe('secret-word-2');
	});

	it('removes an added field and keeps the remaining secret words', async () => {
		renderForm();
		await fireEvent.click(screen.getByRole('button', { name: 'Add another secret word' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Add another secret word' }));
		await fireEvent.input(screen.getByLabelText('Secret word 1'), { target: { value: 'Loki' } });
		await fireEvent.input(screen.getByLabelText('Secret word 2'), { target: { value: 'Shrek' } });
		await fireEvent.input(screen.getByLabelText('Secret word 3'), { target: { value: 'Yoda' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Remove secret word 2' }));
		expect(screen.getAllByLabelText(/^Secret word \d$/)).toHaveLength(2);
		expect((screen.getByLabelText('Secret word 2') as HTMLInputElement).value).toBe('Yoda');
	});

	it('submits only the non-empty secret words', async () => {
		const onSubmit = renderForm();
		await fireEvent.click(screen.getByRole('button', { name: 'Add another secret word' }));
		await fireEvent.input(screen.getByLabelText('Secret word 1'), { target: { value: ' Loki ' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Submit words' }));
		expect(onSubmit.mock.calls).toEqual([[['Loki']]]);
	});
});
