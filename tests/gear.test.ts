import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkGear, dps, firstCost, gains, type Gear } from '../src/lib/gear.ts';

const G: Gear = JSON.parse(readFileSync(new URL('../data/gear.json', import.meta.url), 'utf8'));
const w = (n: string) => G.weapons.find((x) => x.name === n)!;

test('本番の data/gear.json は NG が無く、17 系統 46 変種・防具 5', () => {
  assert.deepEqual(checkGear(G), []);
  assert.deepEqual([G.weapons.length, G.weapons.flatMap((x) => x.marks).length, G.armor.length], [17, 46, 5]);
});
test('秒間ダメージ・初めて手にするまでの費用', () => {
  assert.equal(dps(w('AP Scalar')), 233);
  assert.equal(dps(w('TAG-12K')), 288);
  assert.equal(firstCost(w('KL-545').marks[2]), 175000 + 6000);
  assert.equal(firstCost(w('LM 249').marks[0]), null);
});
test('Mk の変化: 構える時間は短いほど良く、変わらない項目は出さない', () => {
  const k = w('KL-545').marks;
  assert.deepEqual(gains(k[0], k[1]).map((x) => [x.label, x.before, x.after, x.better]), [['構える時間', 300, 250, true], ['60 m のダメージ', 12, 12, true]].filter((x) => x[1] !== x[2]));
  assert.deepEqual(gains(k[1], k[2]).map((x) => x.label), ['装弾数', '全ダメージの射程', '60 m のダメージ']);
  assert.deepEqual(gains(w('MC-10').marks[0], w('MC-10').marks[1]), []);
});
test('検査: 連射の桁落ち・累計の食い違い・載せない出典を落とす', () => {
  const b: Gear = JSON.parse(JSON.stringify(G));
  b.weapons[0].rpm = 1; b.weapons[3].marks[1].total = 1; b.sources[0].url = 'https://timesaver.gg/x';
  const ng = checkGear(b).join();
  assert.match(ng, /連射/); assert.match(ng, /累計/); assert.match(ng, /載せないサイト/);
});
