import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_ALIAS, MAX_PLAYERS, advanceWinners, aliasError, buildBracket, nextMatch, roundName, shuffle } from '../src/game/bracket.js';

// Deterministic "random" so every run draws the same bracket.
const seeded = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
};

const names = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

test('shuffle keeps every player exactly once', () => {
  const players = names(8);
  const shuffled = shuffle(players, seeded(1));
  assert.equal(shuffled.length, 8);
  assert.deepEqual([...shuffled].sort(), [...players].sort());
  assert.deepEqual(players, names(8), 'the input array is not modified');
});

for (const [count, rounds, byes] of [[2, 1, 0], [3, 2, 1], [5, 3, 3], [6, 3, 2], [8, 3, 0]] as const) {
  test(`${count} players: ${rounds} rounds and ${byes} byes`, () => {
    const bracket = buildBracket(names(count), seeded(count));
    assert.equal(bracket.length, rounds);
    assert.equal(bracket[0].filter((m) => m.players[1] === null).length, byes);
    // a bye wins immediately and already sits in round 2
    for (const [i, m] of bracket[0].entries()) {
      if (m.players[1] === null) {
        assert.equal(m.winner, m.players[0]);
        assert.equal(bracket[1][Math.floor(i / 2)].players[i % 2], m.winner);
      }
    }
    const seated = bracket[0].flatMap((m) => m.players).filter((p) => p !== null);
    assert.deepEqual([...seated].sort(), names(count).sort());
  });
}

test('playing every match crowns exactly one champion', () => {
  const bracket = buildBracket(names(7), seeded(7));
  let played = 0;
  for (let next = nextMatch(bracket); next; next = nextMatch(bracket)) {
    const match = bracket[next.round][next.index];
    match.winner = match.players[0];
    advanceWinners(bracket);
    played++;
  }
  const final = bracket[bracket.length - 1][0];
  assert.ok(final.winner, 'the final has a winner');
  assert.equal(played, 6, '7 players need 6 real matches (one bye)');
});

test('round names count from the final backwards', () => {
  assert.deepEqual([0, 1, 2].map((r) => roundName(r, 3)), ['Quarter-finals', 'Semi-finals', 'Final']);
  assert.equal(roundName(0, 4), 'Round 1');
});

test('aliases: empty, too long, taken (any case) and full are refused', () => {
  assert.equal(aliasError('', []), 'Type an alias first.');
  assert.match(aliasError('x'.repeat(MAX_ALIAS + 1), []) ?? '', /at most 16/);
  assert.match(aliasError('TAHA', ['taha']) ?? '', /already taken/);
  assert.match(aliasError('new', names(MAX_PLAYERS)) ?? '', /8 players at most/);
  assert.equal(aliasError('ok', ['other']), null);
});
