import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, getNormalizedPointer, getHeroMotion, HERO_MOTION_LIMITS } from '../src/hero-motion.js';

const rect = Object.freeze({ left: 10, top: 20, width: 200, height: 100 });
const absoluteLimits = { rotateX: 6, rotateY: 8, shiftX: 7, shiftY: 5 };

function assertNeutral(point) {
  assert.equal(point.x, 0);
  assert.equal(point.y, 0);
}

function assertBoundedMotion(motion) {
  assert.deepEqual(Object.keys(motion).sort(), Object.keys(absoluteLimits).sort());
  for (const [key, maximum] of Object.entries(absoluteLimits)) {
    assert.ok(Number.isFinite(motion[key]), `${key} debe ser un número finito`);
    assert.ok(Math.abs(motion[key]) <= maximum, `${key} excedió ${maximum}: ${motion[key]}`);
  }
}

test('clamp conserva valores interiores y acota los extremos', () => {
  assert.equal(clamp(0.25), 0.25);
  assert.equal(clamp(1000), 1);
  assert.equal(clamp(-1000), -1);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(4, 0, 10), 4);
});

test('el puntero central es neutral y las esquinas conservan ambos ejes', () => {
  assertNeutral(getNormalizedPointer(110, 70, rect));
  assert.deepEqual(getNormalizedPointer(10, 20, rect), { x: -1, y: -1 });
  assert.deepEqual(getNormalizedPointer(210, 20, rect), { x: 1, y: -1 });
  assert.deepEqual(getNormalizedPointer(10, 120, rect), { x: -1, y: 1 });
  assert.deepEqual(getNormalizedPointer(210, 120, rect), { x: 1, y: 1 });
});

test('un puntero fuera del hero permanece dentro del rango normalizado', () => {
  assert.deepEqual(getNormalizedPointer(-10000, 10000, rect), { x: -1, y: 1 });
  assert.deepEqual(getNormalizedPointer(10000, -10000, rect), { x: 1, y: -1 });
});

test('geometría vacía y coordenadas no finitas no generan movimiento', () => {
  for (const invalidRect of [
    { ...rect, width: 0 },
    { ...rect, height: 0 },
    { ...rect, width: -1 },
    { ...rect, height: -1 },
    { ...rect, width: Number.POSITIVE_INFINITY },
    { ...rect, height: Number.NaN },
    { ...rect, left: Number.NaN },
    { ...rect, top: Number.NEGATIVE_INFINITY },
  ]) {
    assertNeutral(getNormalizedPointer(110, 70, invalidRect));
  }
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assertNeutral(getNormalizedPointer(value, 70, rect));
    assertNeutral(getNormalizedPointer(110, value, rect));
  }
});

test('el centro mantiene el hero sin inclinación ni desplazamiento', () => {
  const motion = getHeroMotion({ x: 0, y: 0 });
  assertBoundedMotion(motion);
  for (const value of Object.values(motion)) assert.equal(Math.abs(value), 0);
});

test('el movimiento horizontal y vertical afecta los ejes correspondientes', () => {
  const horizontal = getHeroMotion({ x: 1, y: 0 });
  assert.equal(Math.abs(horizontal.rotateX), 0);
  assert.equal(Math.abs(horizontal.rotateY), 8);
  assert.equal(Math.abs(horizontal.shiftX), 7);
  assert.equal(Math.abs(horizontal.shiftY), 0);
  const vertical = getHeroMotion({ x: 0, y: 1 });
  assert.equal(Math.abs(vertical.rotateX), 6);
  assert.equal(Math.abs(vertical.rotateY), 0);
  assert.equal(Math.abs(vertical.shiftX), 0);
  assert.equal(Math.abs(vertical.shiftY), 5);
});

test('el movimiento es simétrico y no sobrepasa límites con entradas extremas', () => {
  const positive = getHeroMotion({ x: 1, y: 1 });
  const negative = getHeroMotion({ x: -1, y: -1 });
  assertBoundedMotion(positive);
  assertBoundedMotion(negative);
  for (const key of Object.keys(absoluteLimits)) assert.equal(positive[key] + negative[key], 0);
  for (const point of [{ x: 10000, y: -10000 }, { x: -10000, y: 10000 }, { x: 0.5, y: -0.5 }]) {
    assertBoundedMotion(getHeroMotion(point));
  }
});

test('los cálculos no modifican las entradas ni permiten alterar la configuración compartida', () => {
  const point = Object.freeze({ x: 0.4, y: -0.3 });
  const originalPoint = { ...point };
  const originalRect = { ...rect };
  const first = getHeroMotion(point);
  const second = getHeroMotion(point);
  assert.deepEqual(first, second);
  getNormalizedPointer(110, 70, rect);
  assert.deepEqual(point, originalPoint);
  assert.deepEqual(rect, originalRect);
  assert.ok(Object.isFrozen(HERO_MOTION_LIMITS));
});
