import { expect, test } from '@playwright/test';
import { convexHull, getContact } from '../src/scripts/collision';

const diamond = convexHull([
  { x: 0, y: -10 },
  { x: 10, y: 0 },
  { x: 0, y: 10 },
  { x: -10, y: 0 },
  { x: 0, y: 0 },
  { x: 5, y: 5 },
  { x: 0, y: -10 },
]);

test('empty corners of overlapping bounding boxes do not collide', () => {
  expect(diamond).toHaveLength(4);
  // Both bounding boxes overlap by 5px, but the rotated surfaces remain apart.
  expect(
    getContact({ x: 0, y: 0, hull: diamond }, { x: 15, y: 15, hull: diamond }),
  ).toBeNull();
  expect(
    getContact(
      { x: 0, y: 0, hull: diamond },
      { x: 20.01, y: 0, hull: diamond },
    ),
  ).toBeNull();
});

test('contact begins at the surface and resolves along its diagonal normal', () => {
  const a = { x: 0, y: 0, hull: diamond };
  expect(getContact(a, { x: 20, y: 0, hull: diamond })).toBeNull();
  const b = { x: 8, y: 8, hull: diamond };
  const contact = getContact(a, b)!;
  expect(contact.depth).toBeCloseTo(Math.sqrt(8));
  expect(contact.nx).toBeCloseTo(Math.SQRT1_2);
  expect(contact.ny).toBeCloseTo(Math.SQRT1_2);
  b.x += contact.nx * (contact.depth + 0.001);
  b.y += contact.ny * (contact.depth + 0.001);
  expect(getContact(a, b)).toBeNull();
});

test('small scaled silhouettes do not inherit larger collision margins', () => {
  const small = diamond.map((point) => ({
    x: point.x * 0.4,
    y: point.y * 0.4,
  }));
  expect(
    getContact({ x: 0, y: 0, hull: small }, { x: 8.1, y: 0, hull: small }),
  ).toBeNull();
  expect(
    getContact({ x: 0, y: 0, hull: small }, { x: 7.9, y: 0, hull: small }),
  ).not.toBeNull();
});
