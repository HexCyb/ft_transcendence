import { el } from '../dom.js';
import { MAX_ALIAS, MAX_PLAYERS, advanceWinners, aliasError, buildBracket, nextMatch, roundName, type Match } from '../game/bracket.js';
import { mountMatch } from './match.js';

// Kept outside the view: leaving the page and coming back keeps the tournament.
let registered: string[] = [];
let rounds: Match[][] | null = null;
let current: { round: number; index: number } | null = null;

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
      const problem = aliasError(alias, registered);
      if (problem) {
        error.textContent = problem;
        input.focus();
        return;
      }
      registered.push(alias);
      draw();
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
