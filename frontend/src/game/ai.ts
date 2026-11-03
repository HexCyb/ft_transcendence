import { BALL_R, HEIGHT, PADDLE_MARGIN, PADDLE_W, WIDTH, type GameState, type PaddleInput } from './pong.js';

const LOOK_EVERY = 1;   // seconds: the AI may refresh its view of the game only once per second

// The AI plays like a human with the same keys: it looks at the game once per
// second, predicts where the ball will cross its side (bounces included), and
// until the next look it holds up / down while steering a remembered position
// of its own paddle toward that point.
export class PongAI {
  readonly input: PaddleInput = { up: false, down: false };
  private sinceLook = LOOK_EVERY;
  private target = HEIGHT / 2;
  private paddleTop = 0;

  constructor(private readonly side: 0 | 1, private readonly paddleSpeed: number) {}

  step(state: GameState, dt: number): void {
    this.sinceLook += dt;
    if (this.sinceLook >= LOOK_EVERY) {
      this.sinceLook = 0;
      this.look(state);
    }
    const center = this.paddleTop + state.paddleHeight / 2;
    const deadZone = state.paddleHeight * 0.15;
    this.input.up = center > this.target + deadZone;
    this.input.down = center < this.target - deadZone;
    const direction = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);
    this.paddleTop = Math.min(Math.max(this.paddleTop + direction * this.paddleSpeed * dt, 0), HEIGHT - state.paddleHeight);
  }

  private look(state: GameState): void {
    this.paddleTop = state.paddles[this.side];
    const ball = state.ball;
    const comingToMe = this.side === 1 ? ball.vx > 0 : ball.vx < 0;
    if (!comingToMe) {
      this.target = HEIGHT / 2;     // wait in the middle
      return;
    }
    const x = this.side === 1 ? WIDTH - PADDLE_MARGIN - PADDLE_W - BALL_R : PADDLE_MARGIN + PADDLE_W + BALL_R;
    const travel = (x - ball.x) / ball.vx;
    this.target = reflect(ball.y + ball.vy * travel) + (Math.random() - 0.5) * state.paddleHeight * 0.6;
  }
}

// Folds a straight line back between the top and bottom walls, like the ball bouncing.
export function reflect(y: number): number {
  const span = HEIGHT - 2 * BALL_R;
  let position = (((y - BALL_R) % (2 * span)) + 2 * span) % (2 * span);
  if (position > span) position = 2 * span - position;
  return position + BALL_R;
}
