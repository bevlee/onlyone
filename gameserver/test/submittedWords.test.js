import { expect } from 'chai';
import { SubmittedWords } from '../modules/submittedWords.js';

describe('Your words pool', () => {
  const players = ['alice-id', 'bob-id', 'charlie-id'];

  it('keeps answers private in progress messages', () => {
    const pool = new SubmittedWords(players);
    expect(pool.submit(players[0], ['Secret holiday'])).to.deep.equal({
      success: true,
    });
    expect(pool.progress(players)).to.deep.equal({ submitted: 1, total: 3 });
  });

  it('never assigns an answer to any of its submitters and draws it only once', () => {
    const pool = new SubmittedWords(players);
    pool.submit(players[0], ['  Loki  ']);
    pool.submit(players[1], ['LOKI']);
    expect(pool.remaining(players)).to.equal(1);
    expect(pool.draw(players)).to.deep.equal({
      word: 'Loki',
      guesserId: players[2],
      authorIds: [players[0], players[1]],
    });
    expect(pool.draw(players)).to.equal(null);
  });

  it('excludes answers known to everyone without stalling the game', () => {
    const pool = new SubmittedWords(players);
    for (const player of players) pool.submit(player, ['Shrek']);
    expect(pool.remaining(players)).to.equal(0);
    expect(pool.draw(players)).to.equal(null);
  });

  it('assigns only connected guessers and ignores disconnected players in readiness', () => {
    const pool = new SubmittedWords(players);
    pool.submit(players[0], ['Skippy']);
    expect(pool.progress(players.slice(0, 2))).to.deep.equal({
      submitted: 1,
      total: 2,
    });
    expect(pool.draw([players[0]])).to.equal(null);
    expect(pool.draw([players[0], players[2]]).guesserId).to.equal(players[2]);
  });

  it('does not assign guesses to new connections that may already know submitted answers', () => {
    const pool = new SubmittedWords(players);
    pool.submit(players[0], ['Loki']);
    expect(pool.remaining([players[0], 'reconnected-player'])).to.equal(0);
    expect(pool.draw([players[0], 'reconnected-player'])).to.equal(null);
  });

  it('balances turns among equally eligible guessers', () => {
    const pool = new SubmittedWords(players);
    pool.submit(players[0], ['Loki', 'Thor', 'Odin']);
    const first = pool.draw(players);
    const second = pool.draw(players);
    expect(first.guesserId).not.to.equal(second.guesserId);
  });

  for (const answers of [
    null,
    [],
    [''],
    ['a', 'b', 'c', 'd'],
    ['x'.repeat(61)],
    [42],
    ['<redacted>'],
    ['two\nlines'],
  ]) {
    it(`rejects malformed submission ${JSON.stringify(answers)}`, () => {
      const pool = new SubmittedWords(players);
      expect(pool.submit(players[0], answers).success).to.equal(false);
      expect(pool.remaining(players)).to.equal(0);
    });
  }

  it('rejects repeat submissions and non-participants', () => {
    const pool = new SubmittedWords(players);
    pool.submit(players[0], ['Loki']);
    expect(pool.submit(players[0], ['Thor']).success).to.equal(false);
    expect(pool.submit('outsider', ['Odin']).success).to.equal(false);
    expect(pool.remaining(players)).to.equal(1);
  });
});
