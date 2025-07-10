import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import Timer from './Timer.svelte';

describe('Timer Component', () => {
    beforeEach(() => {
        vi.clearAllTimers();
    });

    it('should display initial countdown value', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: 10,
                submitAnswer: mockSubmitAnswer,
                timerText: 'Time left:'
            }
        });

        expect(screen.getByText('Time left:')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should handle custom timer text', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: 30,
                submitAnswer: mockSubmitAnswer,
                timerText: 'Custom Timer Text:'
            }
        });

        expect(screen.getByText('Custom Timer Text:')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should display timer with different initial values', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: 60,
                submitAnswer: mockSubmitAnswer,
                timerText: 'Time left:'
            }
        });

        expect(screen.getByText('Time left:')).toBeInTheDocument();
        expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should render timer with zero count (shows countdown)', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: 0,
                submitAnswer: mockSubmitAnswer,
                timerText: 'Time left:'
            }
        });

        // When count is 0 initially, it should still show the countdown
        expect(screen.getByText('Time left:')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render timer with negative count (shows countdown)', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: -5,
                submitAnswer: mockSubmitAnswer,
                timerText: 'Time left:'
            }
        });

        // When count is negative initially, it should still show the countdown
        expect(screen.getByText('Time left:')).toBeInTheDocument();
        expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should accept submitAnswer function as prop', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: 10,
                submitAnswer: mockSubmitAnswer,
                timerText: 'Time left:'
            }
        });

        // Component should render without errors
        expect(screen.getByText('Time left:')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should render with default timer text when not provided', () => {
        const mockSubmitAnswer = vi.fn();
        render(Timer, {
            props: {
                count: 15,
                submitAnswer: mockSubmitAnswer
                // timerText not provided, should use default
            }
        });

        expect(screen.getByText('Time left:')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
    });
}); 