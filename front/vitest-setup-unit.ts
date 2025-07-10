import '@testing-library/jest-dom';

// Configure testing-library
import { configure } from '@testing-library/svelte';

configure({
    testIdAttribute: 'data-testid',
}); 