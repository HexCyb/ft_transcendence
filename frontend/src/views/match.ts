import { el } from '../dom.js';
import { PongAI } from '../game/ai.js';
import { HEIGHT, PADDLE_SPEED, PongMatch, WIDTH, type PaddleInput } from '../game/pong.js';
import { loadSettings } from '../settings.js';

export interface MatchScreen {
  names: [string, string];
  againstAI?: boolean;
  onEnd: (winner: 0 | 1, actions: HTMLElement) => void;
}

const KEYS: Record<string, [0 | 1, keyof PaddleInput]> = {
  KeyW: [0, 'up'],
  KeyS: [0, 'down'],
  ArrowUp: [1, 'up'],
  ArrowDown: [1, 'down'],
};

// Puts a match on the page and returns the function that removes it again.
export function mountMatch(root: HTMLElement, screen: MatchScreen): () => void {
  const canvas = el('canvas', {
    width: WIDTH,
    height: HEIGHT,
    class: 'board',
    'aria-label': `Pong: ${screen.names[0]} against ${screen.names[1]}`,
  });
  const help = screen.againstAI ? 'You: W / S   ·   Space: pause' : 'Left: W / S   ·   Right: ↑ / ↓   ·   Space: pause';
  const actions = el('div', { class: 'actions' });
  root.append(el('section', { class: 'match' }, canvas, el('p', { class: 'help' }, help), actions));

  const inputs: [PaddleInput, PaddleInput] = [{ up: false, down: false }, { up: false, down: false }];
  const ai = screen.againstAI ? new PongAI(1, PADDLE_SPEED) : null;
  if (ai) inputs[1] = ai.input;

  const game = new PongMatch({
    canvas,
    names: screen.names,
    settings: loadSettings(),
    inputs,
    onStep: ai ? (state, dt) => ai.step(state, dt) : undefined,
    onEnd: (winner) => screen.onEnd(winner, actions),
  });

  const handleKey = (pressed: boolean) => (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (pressed && !event.repeat) game.togglePause();
      return;
    }
    const binding = KEYS[event.code];
    if (!binding || (ai && binding[0] === 1)) return;
    event.preventDefault();         // arrows must not scroll the page
    inputs[binding[0]][binding[1]] = pressed;
  };
  const keydown = handleKey(true);
  const keyup = handleKey(false);
  const release = (): void => {
    for (const input of inputs) {
      input.up = false;
      input.down = false;
    }
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', release);
  game.start();

  return () => {
    game.stop();
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', release);
  };
}
