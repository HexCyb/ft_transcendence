import { el, link } from '../dom.js';
import { navigate } from '../router.js';
import { POINT_CHOICES, loadSettings, saveSettings, type BallSpeed, type PaddleSize, type Settings } from '../settings.js';
import { mountMatch } from './match.js';

function card(href: string, title: string, text: string): HTMLAnchorElement {
  const anchor = link(href, '', 'card');
  anchor.append(el('h2', {}, title), el('p', {}, text));
  return anchor;
}

export function homeView(root: HTMLElement): void {
  root.append(
    el('section', { class: 'hero' },
      el('h1', {}, 'PONG'),
      el('p', { class: 'lead' }, 'The 1972 classic in the browser: two players on one keyboard, a tournament for up to eight, or a match against the AI.'),
      el('div', { class: 'cards' },
        card('/play', '1 vs 1', 'Two players, one keyboard. W / S against ↑ / ↓.'),
        card('/tournament', 'Tournament', '2 to 8 players pick an alias, then knockout matches until one is left.'),
        card('/ai', 'vs AI', 'An opponent that looks at the game only once per second and has to predict the ball.'),
        card('/settings', 'Settings', 'Points to win, ball speed and paddle size.'),
      ),
    ),
  );
}

function replay(path: string, actions: HTMLElement, text: string): void {
  actions.append(
    el('button', { class: 'primary', onclick: () => navigate(path) }, 'Play again'),
    link('/', 'Home', 'button'),
    el('p', { class: 'result', role: 'status' }, text),
  );
}

export function playView(root: HTMLElement): () => void {
  const names: [string, string] = ['Player 1', 'Player 2'];
  return mountMatch(root, { names, onEnd: (winner, actions) => replay('/play', actions, `${names[winner]} wins`) });
}

export function aiView(root: HTMLElement): () => void {
  return mountMatch(root, {
    names: ['You', 'AI'],
    againstAI: true,
    onEnd: (winner, actions) => replay('/ai', actions, winner === 0 ? 'You beat the AI' : 'The AI wins'),
  });
}

function choiceGroup<T extends string | number>(
  legend: string, name: string, options: [T, string][], current: T, onPick: (value: T) => void,
): HTMLFieldSetElement {
  const group = el('fieldset', { class: 'choices' }, el('legend', {}, legend));
  for (const [value, label] of options) {
    const input = el('input', { type: 'radio', name, value: String(value), onchange: () => onPick(value) });
    input.checked = value === current;
    group.append(el('label', {}, input, label));
  }
  return group;
}

export function settingsView(root: HTMLElement): void {
  const settings: Settings = loadSettings();
  const status = el('p', { class: 'result', role: 'status' });
  const update = (change: Partial<Settings>): void => {
    Object.assign(settings, change);
    saveSettings(settings);
    status.textContent = 'Saved: every new match uses these settings.';
  };
  root.append(
    el('section', { class: 'panel' },
      el('h1', {}, 'Settings'),
      choiceGroup('Points to win', 'points', POINT_CHOICES.map((n): [number, string] => [n, String(n)]),
        settings.pointsToWin, (pointsToWin) => update({ pointsToWin })),
      choiceGroup<BallSpeed>('Ball speed', 'speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']],
        settings.ballSpeed, (ballSpeed) => update({ ballSpeed })),
      choiceGroup<PaddleSize>('Paddle size', 'paddle', [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']],
        settings.paddleSize, (paddleSize) => update({ paddleSize })),
      status,
    ),
  );
}

export function notFoundView(root: HTMLElement): void {
  root.append(el('section', { class: 'panel' }, el('h1', {}, '404'), el('p', {}, 'This page does not exist.'), link('/', 'Back home', 'button')));
}
