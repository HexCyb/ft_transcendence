import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reflect } from '../src/game/ai.js';
import { BALL_R, HEIGHT } from '../src/game/pong.js';

test('reflect leaves a point between the walls untouched', () => {
  assert.equal(reflect(250), 250);
});

test('reflect folds a predicted position back like a wall bounce', () => {
  const span = HEIGHT - 2 * BALL_R;
  assert.equal(reflect(HEIGHT - BALL_R + 30), HEIGHT - BALL_R - 30, 'bounce off the bottom wall');
  assert.equal(reflect(BALL_R - 30), BALL_R + 30, 'bounce off the top wall');
  assert.equal(reflect(BALL_R + 2 * span + 10), BALL_R + 10, 'two bounces come back to the start');
});

test('the AI target always stays inside the field', () => {
  for (let y = -3000; y <= 3000; y += 37) {
    const r = reflect(y);
    assert.ok(r >= BALL_R && r <= HEIGHT - BALL_R, `reflect(${y}) = ${r}`);
  }
});
