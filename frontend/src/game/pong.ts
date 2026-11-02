import type { Settings } from '../settings.js';

export const WIDTH = 800;
export const HEIGHT = 500;
export const PADDLE_W = 12;
export const PADDLE_MARGIN = 24;
export const BALL_R = 8;
export const PADDLE_SPEED = 430;            // same for every player, human or AI

const BALL_SPEEDS = { slow: 300, normal: 380, fast: 480 } as const;
const PADDLE_SIZES = { small: 70, normal: 100, large: 140 } as const;
const MAX_SPEED = 950;
const SPEED_UP = 1.06;                      // each paddle hit makes the ball a bit faster
const MAX_ANGLE = Math.PI / 3.2;            // hitting the paddle's edge sends the ball steeply
const STEP = 1 / 120;                       // fixed physics step: same game on every screen

export interface PaddleInput {
  up: boolean;
  down: boolean;
}

export interface GameState {
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: [number, number];                // top edge of the left and right paddle
  paddleHeight: number;
  scores: [number, number];
}

export interface MatchOptions {
  canvas: HTMLCanvasElement;
  names: [string, string];
  settings: Settings;
  inputs: [PaddleInput, PaddleInput];
  onEnd: (winner: 0 | 1) => void;
  onStep?: (state: GameState, dt: number) => void;
}

type Phase = 'countdown' | 'playing' | 'paused' | 'over';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export class PongMatch {
  readonly state: GameState;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly baseSpeed: number;
  private phase: Phase = 'countdown';
  private countdown = 3;
  private serveDirection = Math.random() < 0.5 ? -1 : 1;
  private winner: 0 | 1 | null = null;
  private frame = 0;
  private last = 0;
  private pending = 0;

  constructor(private readonly options: MatchOptions) {
    const ctx = options.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported');
    this.ctx = ctx;
    this.baseSpeed = BALL_SPEEDS[options.settings.ballSpeed];
    const height = PADDLE_SIZES[options.settings.paddleSize];
    this.state = {
      ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 },
      paddles: [(HEIGHT - height) / 2, (HEIGHT - height) / 2],
      paddleHeight: height,
      scores: [0, 0],
    };
  }

  start(): void {
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  private loop = (now: number): void => {
    this.pending += Math.min((now - this.last) / 1000, 0.1);   // a background tab must not teleport the ball
    this.last = now;
    while (this.pending >= STEP) {
      this.update(STEP);
      this.pending -= STEP;
    }
    this.draw();
    if (this.phase !== 'over') this.frame = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.phase === 'paused' || this.phase === 'over') return;
    this.options.onStep?.(this.state, dt);
    this.movePaddles(dt);
    if (this.phase === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.serve();
      return;
    }
    this.moveBall(dt);
  }

  private movePaddles(dt: number): void {
    const s = this.state;
    for (const side of [0, 1] as const) {
      const input = this.options.inputs[side];
      const direction = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      s.paddles[side] = clamp(s.paddles[side] + direction * PADDLE_SPEED * dt, 0, HEIGHT - s.paddleHeight);
    }
  }

  private serve(): void {
    const angle = (Math.random() * 2 - 1) * (Math.PI / 6);
    const ball = this.state.ball;
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = Math.cos(angle) * this.baseSpeed * this.serveDirection;
    ball.vy = Math.sin(angle) * this.baseSpeed;
    this.phase = 'playing';
  }

  private moveBall(dt: number): void {
    const ball = this.state.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + BALL_R > HEIGHT) {
      ball.y = HEIGHT - BALL_R;
      ball.vy = -Math.abs(ball.vy);
    }
    const leftFace = PADDLE_MARGIN + PADDLE_W;
    const rightFace = WIDTH - PADDLE_MARGIN - PADDLE_W;
    if (ball.vx < 0 && ball.x - BALL_R <= leftFace && ball.x - BALL_R >= PADDLE_MARGIN - PADDLE_W && this.touches(0)) {
      this.bounce(0, leftFace + BALL_R);
    } else if (ball.vx > 0 && ball.x + BALL_R >= rightFace && ball.x + BALL_R <= WIDTH - PADDLE_MARGIN + PADDLE_W && this.touches(1)) {
      this.bounce(1, rightFace - BALL_R);
    }
    if (ball.x < -BALL_R) this.point(1);
    else if (ball.x > WIDTH + BALL_R) this.point(0);
  }

  private touches(side: 0 | 1): boolean {
    const top = this.state.paddles[side];
    const y = this.state.ball.y;
    return y + BALL_R >= top && y - BALL_R <= top + this.state.paddleHeight;
  }

  // the further from the paddle's center the ball hits, the steeper it leaves
  private bounce(side: 0 | 1, x: number): void {
    const s = this.state;
    const ball = s.ball;
    const center = s.paddles[side] + s.paddleHeight / 2;
    const offset = clamp((ball.y - center) / (s.paddleHeight / 2), -1, 1);
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * SPEED_UP, MAX_SPEED);
    ball.vx = Math.cos(offset * MAX_ANGLE) * speed * (side === 0 ? 1 : -1);
    ball.vy = Math.sin(offset * MAX_ANGLE) * speed;
    ball.x = x;
  }

  private point(scorer: 0 | 1): void {
    const s = this.state;
    s.scores[scorer] += 1;
    s.ball.vx = 0;
    s.ball.vy = 0;
    if (s.scores[scorer] >= this.options.settings.pointsToWin) {
      this.phase = 'over';
      this.winner = scorer;
      this.draw();
      this.options.onEnd(scorer);
      return;
    }
    this.serveDirection = scorer === 0 ? 1 : -1;    // served toward the player who lost the point
    this.phase = 'countdown';
    this.countdown = 1;
  }

  private draw(): void {
    const { ctx } = this;
    const s = this.state;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(245, 247, 255, 0.18)';
    for (let y = 10; y < HEIGHT; y += 30) ctx.fillRect(WIDTH / 2 - 2, y, 4, 16);

    ctx.fillStyle = '#f5f7ff';
    ctx.fillRect(PADDLE_MARGIN, s.paddles[0], PADDLE_W, s.paddleHeight);
    ctx.fillRect(WIDTH - PADDLE_MARGIN - PADDLE_W, s.paddles[1], PADDLE_W, s.paddleHeight);
    if (this.phase === 'playing' || this.phase === 'paused') {
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 56px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(String(s.scores[0]), WIDTH / 4, 20);
    ctx.fillText(String(s.scores[1]), (WIDTH * 3) / 4, 20);
    ctx.font = '16px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(245, 247, 255, 0.7)';
    ctx.fillText(this.options.names[0], WIDTH / 4, 84);
    ctx.fillText(this.options.names[1], (WIDTH * 3) / 4, 84);

    const message = this.message();
    if (message) {
      ctx.fillStyle = 'rgba(5, 7, 13, 0.7)';
      ctx.fillRect(0, HEIGHT / 2 - 36, WIDTH, 72);
      ctx.fillStyle = '#f5f7ff';
      ctx.font = 'bold 28px ui-monospace, Menlo, Consolas, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, WIDTH / 2, HEIGHT / 2);
    }
  }

  private message(): string {
    if (this.phase === 'paused') return 'PAUSED  ·  Space to resume';
    if (this.phase === 'over' && this.winner !== null) return `${this.options.names[this.winner]} wins!`;
    if (this.phase === 'countdown') return String(Math.ceil(this.countdown));
    return '';
  }
}
