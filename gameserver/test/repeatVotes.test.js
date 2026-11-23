import { expect } from 'chai';
import { RepeatVotes } from '../modules/repeatVotes.js';

describe('RepeatVotes', () => {
  const writers = ['a', 'b', 'c', 'd', 'e'];

  [
    { voters: 1, required: 1 },
    { voters: 2, required: 2 },
    { voters: 3, required: 2 },
    { voters: 4, required: 3 },
    { voters: 5, required: 3 },
    { voters: 6, required: 4 },
  ].forEach(({ voters, required }) => {
    it(`requires ${required} votes for a majority of ${voters} writers`, () => {
      expect(new RepeatVotes(['x'], writers.concat('f').slice(0, voters)).required).to.equal(required);
    });
  });

  [
    { clues: ['hop', 'pouch'], expected: [false, false] },
    { clues: ['hop', 'Hop ', 'pouch'], expected: [true, true, false] },
    { clues: ['<no answer>', 'pouch'], expected: [true, false] },
    { clues: ['', 'pouch'], expected: [true, false] },
  ].forEach(({ clues, expected }) => {
    it(`auto-removes empty and identical clues in ${JSON.stringify(clues)}`, () => {
      expect(new RepeatVotes(clues, writers).autoRemoved).to.deep.equal(expected);
    });
  });

  it('counts one vote per writer and removes a clue at majority', () => {
    const votes = new RepeatVotes(['hop', 'hopping', 'pouch'], writers);
    votes.setMark('a', 0, true);
    votes.setMark('a', 0, true);
    votes.setMark('b', 0, true);
    expect(votes.counts()).to.deep.equal([2, 0, 0]);
    expect(votes.removed()).to.deep.equal([false, false, false]);
    votes.setMark('c', 0, true);
    expect(votes.removed()).to.deep.equal([true, false, false]);
  });

  it('lets a writer clear their mark', () => {
    const votes = new RepeatVotes(['hop'], writers);
    votes.setMark('a', 0, true);
    votes.setMark('a', 0, false);
    expect(votes.counts()).to.deep.equal([0]);
  });

  [
    { name: 'a non-writer', args: ['guesser', 0, true] },
    { name: 'an out-of-range index', args: ['a', 5, true] },
    { name: 'a non-integer index', args: ['a', '0', true] },
    { name: 'a non-boolean mark', args: ['a', 0, 1] },
    { name: 'an auto-removed clue', args: ['a', 1, true] },
  ].forEach(({ name, args }) => {
    it(`rejects a mark from ${name}`, () => {
      const votes = new RepeatVotes(['hop', '<no answer>'], writers);
      expect(votes.setMark(...args)).to.be.false;
      expect(votes.counts()).to.deep.equal([0, 0]);
    });
  });

  it('locks a writer\'s marks after they press Done', () => {
    const votes = new RepeatVotes(['hop'], writers);
    votes.finish('a');
    expect(votes.setMark('a', 0, true)).to.be.false;
  });

  it('is done when every connected writer has finished', () => {
    const votes = new RepeatVotes(['hop'], ['a', 'b', 'c']);
    votes.finish('a');
    expect(votes.allDone(['a', 'b', 'c', 'guesser'])).to.be.false;
    votes.finish('b');
    expect(votes.allDone(['a', 'b', 'guesser'])).to.be.true;
  });

  it('never exposes who voted in public state', () => {
    const votes = new RepeatVotes(['hop'], writers);
    votes.setMark('a', 0, true);
    votes.finish('b');
    expect(votes.publicState()).to.deep.equal({
      counts: [1], autoRemoved: [false], required: 3, voters: 5, done: 1,
    });
  });
});
