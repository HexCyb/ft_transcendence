// Tournament rules, kept free of the DOM so they can be unit tested.

export interface Match {
  players: [string | null, string | null];
  winner: string | null;
}

export const MAX_PLAYERS = 8;
export const MAX_ALIAS = 16;

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Why an alias cannot join, or null when it can.
export function aliasError(alias: string, registered: readonly string[]): string | null {
  if (!alias) return 'Type an alias first.';
  if (alias.length > MAX_ALIAS) return `An alias has at most ${MAX_ALIAS} characters.`;
  if (registered.some((p) => p.toLowerCase() === alias.toLowerCase())) return `"${alias}" is already taken.`;
  if (registered.length >= MAX_PLAYERS) return `${MAX_PLAYERS} players at most.`;
  return null;
}

// Single elimination. With a player count that is not a power of two, some
// first-round matches are byes: that player goes straight to the next round.
export function buildBracket(names: readonly string[], random: () => number = Math.random): Match[][] {
  const players = shuffle(names, random);
  let size = 2;
  while (size < players.length) size *= 2;
  const byes = size - players.length;
  const first: Match[] = [];
  let next = 0;
  for (let m = 0; m < size / 2; m++) {
    const a = players[next++];
    const b = m < byes ? null : players[next++];
    first.push({ players: [a, b], winner: b === null ? a : null });
  }
  const bracket: Match[][] = [first];
  for (let count = size / 4; count >= 1; count /= 2) {
    bracket.push(Array.from({ length: count }, (): Match => ({ players: [null, null], winner: null })));
  }
  advanceWinners(bracket);
  return bracket;
}

export function advanceWinners(bracket: Match[][]): void {
  for (let r = 0; r + 1 < bracket.length; r++) {
    bracket[r].forEach((match, i) => {
      if (match.winner) bracket[r + 1][Math.floor(i / 2)].players[i % 2] = match.winner;
    });
  }
}

export function nextMatch(bracket: Match[][]): { round: number; index: number } | null {
  for (let r = 0; r < bracket.length; r++) {
    for (let i = 0; i < bracket[r].length; i++) {
      const m = bracket[r][i];
      if (!m.winner && m.players[0] && m.players[1]) return { round: r, index: i };
    }
  }
  return null;
}

export function roundName(r: number, total: number): string {
  const fromEnd = total - r;
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semi-finals';
  if (fromEnd === 3) return 'Quarter-finals';
  return `Round ${r + 1}`;
}
