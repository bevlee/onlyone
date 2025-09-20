
import { describe, expect, it } from 'vitest';
import { getStem } from './wordOperations';

describe('stemming a word', () => {
	it('oyster', async () => {
		
        const original: string = "oyster";
        const stemmed: string = getStem(original);
        expect(stemmed).to.equal("oyster");
	});
});
