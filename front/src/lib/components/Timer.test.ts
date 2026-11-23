import { act, cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Timer from './Timer.svelte';

describe('phase timer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it('expires exactly at zero and submits only once', async () => {
		const submitAnswer = vi.fn();
		render(Timer, { count: 2, submitAnswer });
		expect(screen.getByText('2')).toBeInTheDocument();
		await act(() => vi.advanceTimersByTime(2000));
		expect(screen.getByText("Time's up!")).toBeInTheDocument();
		expect(submitAnswer).toHaveBeenCalledTimes(1);
		await act(() => vi.advanceTimersByTime(5000));
		expect(submitAnswer).toHaveBeenCalledTimes(1);
	});

	it('stops when the phase is unmounted', async () => {
		const submitAnswer = vi.fn();
		const view = render(Timer, { count: 2, submitAnswer });
		view.unmount();
		await act(() => vi.advanceTimersByTime(3000));
		expect(submitAnswer).not.toHaveBeenCalled();
	});

	it('uses the phase deadline instead of starting a fresh countdown', async () => {
		const submitAnswer = vi.fn();
		render(Timer, {
			count: 30,
			deadlineAt: Date.now() + 1000,
			submitAnswer,
			timerText: 'Remaining'
		});
		expect(screen.getByText('Remaining')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();
		await act(() => vi.advanceTimersByTime(1000));
		expect(submitAnswer).toHaveBeenCalledTimes(1);
	});

	it('catches up after the browser misses ticks', async () => {
		const submitAnswer = vi.fn();
		render(Timer, { count: 30, submitAnswer });
		vi.setSystemTime(Date.now() + 40000);
		await act(() => vi.advanceTimersByTime(100));
		expect(submitAnswer).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Time's up!")).toBeInTheDocument();
	});

	it('expires immediately if mounted after the deadline', () => {
		const submitAnswer = vi.fn();
		render(Timer, { count: 30, deadlineAt: Date.now() - 1000, submitAnswer });
		expect(submitAnswer).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Time's up!")).toBeInTheDocument();
	});
});
