// Game customization, shared by every mode and remembered in the browser.
export type BallSpeed = 'slow' | 'normal' | 'fast';
export type PaddleSize = 'small' | 'normal' | 'large';

export interface Settings {
  pointsToWin: number;
  ballSpeed: BallSpeed;
  paddleSize: PaddleSize;
}

export const POINT_CHOICES = [3, 5, 7, 11];
const KEY = 'pong-settings';
const DEFAULTS: Settings = { pointsToWin: 5, ballSpeed: 'normal', paddleSize: 'normal' };

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
    return {
      pointsToWin: POINT_CHOICES.includes(Number(saved.pointsToWin)) ? Number(saved.pointsToWin) : DEFAULTS.pointsToWin,
      ballSpeed: saved.ballSpeed === 'slow' || saved.ballSpeed === 'fast' ? saved.ballSpeed : DEFAULTS.ballSpeed,
      paddleSize: saved.paddleSize === 'small' || saved.paddleSize === 'large' ? saved.paddleSize : DEFAULTS.paddleSize,
    };
  } catch {
    return { ...DEFAULTS };   // storage blocked (private mode) or broken value
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage blocked: the choice still applies until the page is reloaded
  }
}
