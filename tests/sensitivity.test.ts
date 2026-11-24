import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cm360, convertSens, positive, sensForCm, yawFromMeasure } from '../src/lib/sensitivity.ts';

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

import { readFileSync } from 'node:fs';
import { checkSens, type SensData } from '../src/lib/sensitivity.ts';

const DATA: SensData = JSON.parse(readFileSync(new URL('../data/sensitivity.json', import.meta.url), 'utf8'));

test('本番の data/sensitivity.json は NG が無く、画面と同じ式で CS2 1・800 DPI は ROB RUN の約 0.213', () => {
  assert.deepEqual(checkSens(DATA), []);
  const cs = DATA.games.find((g) => g.id === 'cs2')!;
  const target = cm360(cs.yaw, 1, 800);
  close(sensForCm(target, DATA.robrun.yaw, 800), 0.022 / 0.1031, 1e-12);
  // ROB RUN の DPI だけ倍にすると感度は半分
  close(sensForCm(target, DATA.robrun.yaw, 1600), 0.022 / 0.1031 / 2, 1e-12);
  close(convertSens({ yaw: cs.yaw, sens: 1, dpi: 800 }, DATA.robrun.yaw, 800), 0.022 / 0.1031);
});

test('係数の表の検査: yaw の欠け・id の重複・http の出典を落とす', () => {
  const bad: SensData = JSON.parse(JSON.stringify(DATA));
  bad.games[0].yaw = 0;
  bad.games.push({ ...bad.games[1] });
  bad.games[2].sources = [{ url: 'http://example.com', title: 'x' }];
  const ng = checkSens(bad).join();
  assert.match(ng, /yaw が正の数でない/);
  assert.match(ng, /重複/);
  assert.match(ng, /https でない/);
});

test('係数の表の検査: 載せないサイト (代行など) の出典を落とす', () => {
  const bad: SensData = JSON.parse(JSON.stringify(DATA));
  bad.robrun.sources.push({ url: 'https://xboosty.com/blog/x', title: 'x' });
  assert.match(checkSens(bad).join(), /載せないサイト/);
});

test('Rust (yaw 0.1125) の感度 0.293 は CS2 1.5 とほぼ同じ振り向き (csdb の例)。ROB RUN にも変換できる', () => {
  const rust = DATA.games.find((g) => g.id === 'rust')!;
  assert.equal(rust.yaw, 0.1125);
  assert.ok(Math.abs(cm360(rust.yaw, 0.293, 800) - cm360(0.022, 1.5, 800)) < 0.1);
  close(sensForCm(cm360(rust.yaw, 0.293, 800), DATA.robrun.yaw, 800), (0.1125 * 0.293) / 0.1031);
  assert.equal(DATA.unsupported.some((u) => u.name === 'Rust'), false);
});
