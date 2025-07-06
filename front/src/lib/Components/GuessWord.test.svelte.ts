
import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import GuessWord from './GuessWord.svelte';

it('test2', () => {
    //clues, role, submitAnswer, leaveGame
    const component = render(GuessWord, { 
        props: {
            clues: [
                'butter',
                'naan',
                'tandoori'
            ],
            role: 'guesser',
            submitAnswer: () => {},
            leaveGame: () => {}        
        }
    } );
    expect(screen.getByText('butter')).toBeInTheDocument();
    expect(1).to.equal(1);
})