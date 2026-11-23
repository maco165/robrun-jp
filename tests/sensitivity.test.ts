import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cm360, convertSens, positive, yawFromMeasure } from '../src/lib/sensitivity.ts';

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('振り向き: CS2 (yaw 0.022) 感度 1・DPI 800 は 360 度に 51.95 cm', () => {
  close(cm360(0.022, 1, 800), (360 / (0.022 * 800)) * 2.54);
  close(cm360(0.022, 1, 800), 51.954545454545, 1e-9);
});

test('変換: CS2 の感度 1 は Valorant (yaw 0.07) の感度 0.3143 (同じ DPI)。往復で元に戻る', () => {
  const v = convertSens({ yaw: 0.022, sens: 1, dpi: 800 }, 0.07, 800);
  close(v, 0.022 / 0.07);
  close(convertSens({ yaw: 0.07, sens: v, dpi: 800 }, 0.022, 800), 1);
  // 変換の前後で振り向きは同じ
  close(cm360(0.022, 1, 800), cm360(0.07, v, 800));
});

test('DPI を変えると感度は逆比で変わる', () => {
  close(convertSens({ yaw: 0.022, sens: 2, dpi: 400 }, 0.022, 800), 1);
});

test('測った振り向きから yaw を逆算すると、元の yaw に戻る', () => {
  close(yawFromMeasure(1.5, 1600, cm360(0.05, 1.5, 1600)), 0.05);
});

test('positive は 0・負・NaN・null を弾く', () => {
  assert.equal(positive(1, 2.5), true);
  assert.equal(positive(1, 0), false);
  assert.equal(positive(-1), false);
  assert.equal(positive(Number.NaN), false);
  assert.equal(positive(null), false);
});
