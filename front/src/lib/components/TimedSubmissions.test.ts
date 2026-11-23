import { act, cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WriteClues from './WriteClues.svelte';
import GuessWord from './GuessWord.svelte';
import SubmitWords from './SubmitWords.svelte';

describe('timed submissions', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it('keeps the submitted clue when the timer expires afterwards', async () => {
		const submitAnswer = vi.fn();
		render(WriteClues, {
			word: 'Loki',
			role: 'writer',
			currentGuesser: 'Bob',
			deadlineAt: Date.now() + 1000,
			submitAnswer
		});
		await fireEvent.input(screen.getByPlaceholderText('Enter a one word clue...'), {
			target: { value: 'helmet' }
		});
		await fireEvent.click(screen.getByText('Submit Clue'));
		await act(() => vi.advanceTimersByTime(2000));
		expect(submitAnswer.mock.calls).toEqual([['helmet']]);
	});

	it('submits an unfinished clue once at the deadline', async () => {
		const submitAnswer = vi.fn();
		render(WriteClues, {
			word: 'Loki',
			role: 'writer',
			currentGuesser: 'Bob',
			deadlineAt: Date.now() + 1000,
			submitAnswer
		});
		await fireEvent.input(screen.getByPlaceholderText('Enter a one word clue...'), {
			target: { value: 'helmet' }
		});
		await act(() => vi.advanceTimersByTime(3000));
		expect(submitAnswer.mock.calls).toEqual([['helmet']]);
	});

	it('sends a missing clue for an invalid unfinished answer', async () => {
		const submitAnswer = vi.fn();
		render(WriteClues, {
			word: 'Loki',
			role: 'writer',
			currentGuesser: 'Bob',
			deadlineAt: Date.now() + 1000,
			submitAnswer
		});
		await fireEvent.input(screen.getByPlaceholderText('Enter a one word clue...'), {
			target: { value: 'LOKI' }
		});
		await act(() => vi.advanceTimersByTime(2000));
		expect(submitAnswer.mock.calls).toEqual([['']]);
	});

	it('writers never submit guesses when the timer expires', async () => {
		const submitAnswer = vi.fn();
		render(GuessWord, {
			role: 'writer',
			clues: ['helmet'],
			dedupedClues: ['helmet'],
			deadlineAt: Date.now() + 1000,
			submitAnswer
		});
		await act(() => vi.advanceTimersByTime(2000));
		expect(submitAnswer).not.toHaveBeenCalled();
	});

	it('submits the guess once and locks the field at timeout', async () => {
		const submitAnswer = vi.fn();
		render(GuessWord, {
			role: 'guesser',
			clues: [],
			dedupedClues: ['helmet'],
			deadlineAt: Date.now() + 1000,
			submitAnswer
		});
		await fireEvent.input(screen.getByPlaceholderText('Enter your guess...'), {
			target: { value: 'Loki' }
		});
		await act(() => vi.advanceTimersByTime(3000));
		expect(submitAnswer.mock.calls).toEqual([['Loki']]);
		expect(screen.getByPlaceholderText('Enter your guess...')).toBeDisabled();
	});

	it('submits draft pool words at the collection deadline', async () => {
		const onSubmit = vi.fn().mockResolvedValue({ success: true });
		render(SubmitWords, { submitted: 0, total: 3, deadlineAt: Date.now() + 1000, onSubmit });
		await fireEvent.input(screen.getByLabelText('Secret word 1'), { target: { value: 'Loki' } });
		await act(() => vi.advanceTimersByTime(3000));
		expect(onSubmit.mock.calls).toEqual([[['Loki']]]);
	});
});
