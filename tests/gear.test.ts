import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkGear, dps, firstCost, gains, withLand, type Gear } from '../src/lib/gear.ts';

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

test('土地込みの順: T3 の Vulture 50 Mk1 は T2 の JP-7 Mk2 より高い (土地を除くと逆)', () => {
  const v = w('Vulture 50').marks[0], j = w('JP-7').marks[1];
  assert.ok(firstCost(v)! < firstCost(j)!);
  assert.deepEqual([withLand(v, G.land), withLand(j, G.land)], [4600000, 1674000]);
});
test('防具と土地の検査: 壊した値を落とす', () => {
  const b: Gear = JSON.parse(JSON.stringify(G));
  Object.assign(b.armor[3], { price: 1, total: 2, unlock: 7, armor: 5, segments: -1 });
  b.land[2] = 0;
  const ng = checkGear(b).join();
  for (const x of [/防げる量/, /累計が前の段/, /値段が前の段/, /土地の費用/]) assert.match(ng, x);
});

test('金額の桁落ち・購入額の欠け・前提の食い違い・負の額を落とす', () => {
  const mut = (f: (g: Gear) => void) => { const b: Gear = JSON.parse(JSON.stringify(G)); f(b); return checkGear(b).join(); };
  const find = (g: Gear, n: string) => g.weapons.find((x) => x.name === n)!.marks;
  assert.match(mut((g) => { const m = find(g, 'AP Scalar'); m[0].total = 57500; m[1].total = 857500; m[2].total = 2457500; }), /前提/);
  assert.match(mut((g) => { find(g, 'STAR-H')[0].price = null; }), /全部あるか/);
  assert.match(mut((g) => { find(g, 'KL-545')[0].price = -1; }), /0 以上/);
  assert.match(mut((g) => { find(g, 'RC 5.56')[0].prereq = 'ない銃 Mk1'; }), /前提/);
  assert.match(mut((g) => { find(g, 'DP-9')[0].mag = 0; }), /装弾/);
  assert.match(mut((g) => { g.armor[1].name = g.armor[0].name; }), /重複/);
});
