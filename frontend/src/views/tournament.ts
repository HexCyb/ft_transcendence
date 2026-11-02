import { el } from '../dom.js';
import { mountMatch } from './match.js';

interface Match {
  players: [string | null, string | null];
  winner: string | null;
}

const MAX_PLAYERS = 8;
const MAX_ALIAS = 16;

// Kept outside the view: leaving the page and coming back keeps the tournament.
let registered: string[] = [];
let rounds: Match[][] | null = null;
let current: { round: number; index: number } | null = null;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Single elimination. With a player count that is not a power of two, some
// first-round matches are byes: that player goes straight to the next round.
function buildBracket(names: string[]): Match[][] {
  const players = shuffle(names);
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

function advanceWinners(bracket: Match[][]): void {
  for (let r = 0; r + 1 < bracket.length; r++) {
    bracket[r].forEach((match, i) => {
      if (match.winner) bracket[r + 1][Math.floor(i / 2)].players[i % 2] = match.winner;
    });
  }
}

function nextMatch(bracket: Match[][]): { round: number; index: number } | null {
  for (let r = 0; r < bracket.length; r++) {
    for (let i = 0; i < bracket[r].length; i++) {
      const m = bracket[r][i];
      if (!m.winner && m.players[0] && m.players[1]) return { round: r, index: i };
    }
  }
  return null;
}

function roundName(r: number, total: number): string {
  const fromEnd = total - r;
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semi-finals';
  if (fromEnd === 3) return 'Quarter-finals';
  return `Round ${r + 1}`;
}

export function tournamentView(root: HTMLElement): () => void {
  let stopMatch: (() => void) | null = null;

  const draw = (): void => {
    stopMatch?.();
    stopMatch = null;
    root.replaceChildren();
    if (!rounds) drawRegistration();
    else if (current) drawMatch(rounds, current);
    else drawBracket(rounds);
  };

  const drawRegistration = (): void => {
    const input = el('input', { type: 'text', maxlength: MAX_ALIAS, placeholder: 'Alias', 'aria-label': 'Player alias', autocomplete: 'off' });
    const error = el('p', { class: 'error', role: 'alert' });
    const add = (): void => {
      const alias = input.value.trim();
      if (!alias) error.textContent = 'Type an alias first.';
      else if (alias.length > MAX_ALIAS) error.textContent = `An alias has at most ${MAX_ALIAS} characters.`;
      else if (registered.some((p) => p.toLowerCase() === alias.toLowerCase())) error.textContent = `"${alias}" is already taken.`;
      else if (registered.length >= MAX_PLAYERS) error.textContent = `${MAX_PLAYERS} players at most.`;
      else {
        registered.push(alias);
        draw();
        return;
      }
      input.focus();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') add();
    });
    const list = el('ol', { class: 'players' });
    registered.forEach((name, i) => {
      list.append(el('li', {}, name, el('button', {
        class: 'ghost', 'aria-label': `Remove ${name}`,
        onclick: () => { registered.splice(i, 1); draw(); },
      }, '✕')));
    });
    const start = el('button', {
      class: 'primary',
      disabled: registered.length < 2,
      onclick: () => { rounds = buildBracket(registered); current = null; draw(); },
    }, 'Start tournament');
    root.append(el('section', { class: 'panel' },
      el('h1', {}, 'Tournament'),
      el('p', {}, `Every player enters an alias (2 to ${MAX_PLAYERS} players). The order of the matches is drawn at random.`),
      el('div', { class: 'row' }, input, el('button', { onclick: add }, 'Add')),
      error, list, start,
    ));
    input.focus();
  };

  const drawBracket = (bracket: Match[][]): void => {
    const columns = el('div', { class: 'bracket' });
    bracket.forEach((round, r) => {
      const column = el('div', { class: 'round' }, el('h3', {}, roundName(r, bracket.length)));
      for (const match of round) {
        const box = el('div', { class: 'pair' });
        for (const player of match.players) {
          const label = player ?? (r === 0 ? 'bye' : '…');
          box.append(el('span', { class: player && player === match.winner ? 'won' : player ? '' : 'empty' }, label));
        }
        column.append(box);
      }
      columns.append(column);
    });
    const upcoming = nextMatch(bracket);
    const champion = bracket[bracket.length - 1][0].winner;
    const banner = el('div', { class: 'banner', role: 'status' });
    if (upcoming) {
      const [a, b] = bracket[upcoming.round][upcoming.index].players;
      banner.append(
        el('p', {}, 'Next match: ', el('strong', {}, a ?? ''), ' vs ', el('strong', {}, b ?? '')),
        el('button', { class: 'primary', onclick: () => { current = upcoming; draw(); } }, 'Play'),
      );
    } else if (champion) {
      banner.append(el('p', { class: 'champion' }, '🏆 ', el('strong', {}, champion), ' wins the tournament!'));
    }
    const reset = el('button', {
      class: 'ghost',
      onclick: () => { rounds = null; current = null; registered = []; draw(); },
    }, 'New tournament');
    root.append(el('section', { class: 'panel wide' }, el('h1', {}, 'Tournament'), banner, columns, reset));
  };

  const drawMatch = (bracket: Match[][], at: { round: number; index: number }): void => {
    const match = bracket[at.round][at.index];
    const names: [string, string] = [match.players[0] ?? '', match.players[1] ?? ''];
    stopMatch = mountMatch(root, {
      names,
      onEnd: (winner, actions) => {
        match.winner = names[winner];
        advanceWinners(bracket);
        current = null;
        actions.append(el('button', { class: 'primary', onclick: draw }, 'Back to the bracket'));
      },
    });
  };

  draw();
  return () => {
    stopMatch?.();
    current = null;     // a match left halfway is replayed from 0-0
  };
}
