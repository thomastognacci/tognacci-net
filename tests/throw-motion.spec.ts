import { expect, test } from '@playwright/test';
import { angularVelocityFromThrow } from '../src/scripts/throw-motion';

test('an off-centre throw derives a mild signed spin', () => {
  // A rightward screen-space throw grabbed below centre becomes positive
  // counter-clockwise rotation in Three's Y-up world coordinates.
  expect(angularVelocityFromThrow(0, 50, 600, 0)).toBeGreaterThan(0);
  expect(angularVelocityFromThrow(0, -50, 600, 0)).toBeLessThan(0);
  expect(angularVelocityFromThrow(0, 0, 600, 0)).toBe(0);
});

test('throw spin is clamped for fast gestures', () => {
  expect(angularVelocityFromThrow(0, 80, -100_000, 0)).toBe(-1.4);
  expect(angularVelocityFromThrow(0, 80, 100_000, 0)).toBe(1.4);
});
