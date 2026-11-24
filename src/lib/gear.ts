// 武器と防具の比較 (正本は data/gear.json)。tier は自分の土地がある地区のレベル (0 は条件なし、null は解放できない)
import { isBlocked } from './links';

export type Mark = { mk: number; tier: number | null; unlock: number | null; total: number | null; price: number | null; jail: number | null; prereq: string | null; mag: number; range: number; aim: number; d60: number };
export type Weapon = { name: string; type: string; rarity: string; damage: number; pellets: number; rpm: number; marks: Mark[] };
export type Armor = { name: string; rarity: string; tier: number | null; unlock: number | null; total: number | null; price: number | null; armor: number; segments: number; block: number };
export type Gear = { checkedAt: string; land: number[]; note: string; sources: { url: string; title: string }[]; weapons: Weapon[]; armor: Armor[] };

/** 胴に当て続けたときの秒間ダメージ (理論値)。ショットガンは全粒が当たった場合 */
export const dps = (w: Weapon) => Math.round((w.damage * w.pellets * w.rpm) / 60);

/** 初めて 1 つ手にするまで = 前提を含む解放の累計 + 購入 1 回 (土地は含まない)。買えない品は null */
export const firstCost = (x: { total: number | null; price: number | null }) => (x.total === null || x.price === null ? null : x.total + x.price);

export type Gain = { label: string; before: number; after: number; unit: string; better: boolean };
/** 1 つ前の Mk からの変化だけを返す。構えの時間は短いほど良い */
export function gains(a: Mark, b: Mark): Gain[] {
  const rows: [string, number, number, string, boolean][] = [
    ['装弾数', a.mag, b.mag, '発', b.mag > a.mag],
    ['全ダメージの射程', a.range, b.range, 'm', b.range > a.range],
    ['構える時間', a.aim, b.aim, 'ms', b.aim < a.aim],
    ['60 m のダメージ', a.d60, b.d60, '', b.d60 > a.d60],
  ];
  return rows.filter(([, x, y]) => x !== y).map(([label, before, after, unit, better]) => ({ label, before, after, unit, better }));
}

export function checkGear(g: Gear): string[] {
  const ng: string[] = [];
  const names = new Set<string>();
  for (const w of g.weapons) {
    if (names.has(w.name)) ng.push(`gear の ${w.name}: 名前が重複`);
    names.add(w.name);
    if (!(w.damage > 0 && w.pellets > 0 && w.rpm >= 60 && w.rpm <= 1500)) ng.push(`gear の ${w.name}: ダメージ・粒数・連射 (60〜1500) の値がおかしい`);
    w.marks.forEach((m, i) => {
      const p = w.marks[i - 1];
      if (m.tier !== null && ![0, 1, 2, 3].includes(m.tier)) ng.push(`gear の ${w.name} Mk${m.mk}: tier は 0〜3`);
      if (p && p.total !== null && m.unlock !== null && p.total + m.unlock !== m.total) ng.push(`gear の ${w.name} Mk${m.mk}: 累計が前の Mk の累計 + 解放費と違う`);
    });
  }
  if (g.land.length !== 4) ng.push('gear: 土地の費用 (land) は T0〜T3 の 4 つ');
  for (const s of g.sources) if (!/^https:\/\//.test(s.url) || isBlocked(s.url)) ng.push(`gear: 出典の URL が https でないか、載せないサイト (${s.url})`);
  return ng;
}
