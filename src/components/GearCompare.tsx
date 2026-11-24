import { useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { Selector } from '@astryxdesign/core/Selector';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Kicker } from './parts';
import { GEAR } from '../lib/data';
import { dps, firstCost, gains, withLand, type Mark } from '../lib/gear';

const EDGE = { border: '1px solid var(--color-border-emphasized)' } as const;
const money = (n: number | null) => (n === null ? '買えない' : `$${n.toLocaleString('en-US')}`);
const tierName = (t: number | null) => (t === null ? '探索のみ' : t === 0 ? '条件なし' : `T${t}`);
const TYPES = [...new Set(GEAR.weapons.map((w) => w.type))];

/** 同じ物差しの棒 1 本。値は文字でも書く */
function Meter({ label, value, max, text }: { label: string; value: number; max: number; text: string }) {
  return (
    <div className="rr-meter">
      <span className="rr-meter-label">{label}</span>
      <span className="rr-meter-track"><span className="rr-meter-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></span>
      <span className="rr-meter-text">{text}</span>
    </div>
  );
}

function Cost({ unlock, total, price, tier, jail }: { unlock: number | null; total: number | null; price: number | null; tier: number | null; jail?: number | null }) {
  const first = firstCost({ total, price });
  return (
    <VStack gap={0.5}>
      <Text type="body" weight="bold" color="accent" hasTabularNumbers>{first === null ? '闇市では買えない' : `初めて手にするまで ${money(first)}（土地を除く）`}</Text>
      {first !== null ? <Text type="supporting" color="secondary" hasTabularNumbers>この段の解放 {money(unlock)}／前提込みの累計 {money(total)}／購入 {money(price)}</Text> : <Text type="supporting" color="secondary">闇市では解放できない（探索や武器庫で手に入れる）</Text>}
      {jail ? <Text type="supporting" color="secondary" hasTabularNumbers>刑期の累計 {jail} 年が要る</Text> : null}
      {tier ? <Text type="supporting" color="placeholder" hasTabularNumbers>T{tier} の土地込み {money((first ?? 0) + GEAR.land[tier])}（土地 {money(GEAR.land[tier])}、家賃は別{tier === 1 ? '。土地が要るかは出典で分かれる' : ''}）</Text> : null}
    </VStack>
  );
}

const max = (f: (m: Mark) => number) => Math.max(...GEAR.weapons.flatMap((w) => w.marks.map(f)));
const MAX = { dps: Math.max(...GEAR.weapons.map(dps)), mag: max((m) => m.mag), range: max((m) => m.range), aim: max((m) => m.aim), cost: Math.max(...GEAR.weapons.flatMap((w) => w.marks.map((m) => withLand(m, GEAR.land) ?? 0))) };

type Sort = 'dps' | 'cost' | 'range' | 'mag';

/** 段で比べる → 1 丁の Mk を比べる → 防具の段を比べる */
export function GearCompare() {
  const [tier, setTier] = useState('1');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState<Sort>('dps');
  const [pick, setPick] = useState('KL-545');
  const rows = GEAR.weapons
    .filter((w) => type === 'all' || w.type === type)
    .flatMap((w) => w.marks.map((m) => ({ w, m, first: withLand(m, GEAR.land) })))
    .filter((r) => (tier === 'all' ? true : tier === 'loot' ? r.m.tier === null : r.m.tier === Number(tier)))
    .sort((a, b) => (sort === 'dps' ? dps(b.w) - dps(a.w) : sort === 'range' ? b.m.range - a.m.range : sort === 'mag' ? b.m.mag - a.m.mag : (a.first ?? Infinity) - (b.first ?? Infinity)) || a.w.name.localeCompare(b.w.name) || a.m.mk - b.m.mk);
  const weapon = GEAR.weapons.find((w) => w.name === pick)!;
  return (
    <VStack gap={8}>
      <VStack as="section" id="gear-tier" className="rr-part" gap={4}>
        <VStack gap={2}>
          <Heading level={2}>段 (T) で武器を比べる</Heading>
          <Divider variant="strong" />
          <Text type="body" color="secondary">T は自分の土地がある地区のレベルです。強さの順ではありません。T1 の品を解放するのに土地が要るかは、出典で分かれています</Text>
          <Kicker>攻略サイトの情報</Kicker>
        </VStack>
        <SegmentedControl label="段" value={tier} onChange={setTier}>
          <SegmentedControlItem value="all" label="全部" />
          <SegmentedControlItem value="0" label="なし" />
          <SegmentedControlItem value="1" label="T1" />
          <SegmentedControlItem value="2" label="T2" />
          <SegmentedControlItem value="3" label="T3" />
          <SegmentedControlItem value="loot" label="探索" />
        </SegmentedControl>
        <Grid columns={{ minWidth: 200, max: 2 }} gap={3}>
          <Selector label="種類" value={type} onChange={setType} options={[{ value: 'all', label: 'すべての種類' }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
          <Selector label="並べ方" value={sort} onChange={(v) => setSort(v as Sort)} options={[{ value: 'dps', label: '秒間ダメージが高い順' }, { value: 'cost', label: '土地込みで安い順' }, { value: 'range', label: '射程が長い順' }, { value: 'mag', label: '装弾数が多い順' }]} />
        </Grid>
        <Text type="supporting" color="placeholder" hasTabularNumbers>{rows.length} 件</Text>
        <Grid columns={{ minWidth: 300, max: 2 }} gap={3}>
          {rows.map(({ w, m, first }) => (
            <Card key={w.name + m.mk} variant="default" padding={3} style={EDGE} data-gear={`${w.name} Mk${m.mk}`}>
              <VStack gap={2}>
                <HStack gap={2} wrap="wrap" vAlign="center">
                  <Text type="body" weight="bold">{w.name} Mk{m.mk}</Text>
                  <Text type="supporting" color="accent" weight="bold">{tierName(m.tier)}</Text>
                  <Text type="supporting" color="placeholder">{w.type}・{w.rarity}</Text>
                </HStack>
                <Text type="supporting" color="secondary" hasTabularNumbers>ダメージ {w.damage}{w.pellets > 1 ? ` × ${w.pellets} 粒` : ''}・連射 {Math.round(w.rpm)}/分{m.prereq ? `・前提 ${m.prereq}` : ''}</Text>
                <Meter label="秒間ダメージ" value={dps(w)} max={MAX.dps} text={String(dps(w))} />
                <Meter label="射程" value={m.range} max={MAX.range} text={`${m.range} m`} />
                <Meter label="装弾数" value={m.mag} max={MAX.mag} text={String(m.mag)} />
                <Meter label="土地込みの額" value={first ?? 0} max={MAX.cost} text={first === null ? '—' : money(first)} />
                <Cost {...m} />
              </VStack>
            </Card>
          ))}
        </Grid>
      </VStack>

      <VStack as="section" id="gear-mk" className="rr-part" gap={4}>
        <VStack gap={2}>
          <Heading level={2}>Mk を上げると何が良くなるか</Heading>
          <Divider variant="strong" />
          <Kicker>攻略サイトの情報</Kicker>
          <Text type="body" color="secondary">近距離の 1 発のダメージと連射は、どの Mk でも変わりません。装弾数・全ダメージの射程・構える時間・60 m のダメージの 4 つを比べ、変わる所を色で示します。構える時間は短いほど速く構えられます</Text>
        </VStack>
        <Selector label="武器" value={pick} onChange={setPick} options={GEAR.weapons.map((w) => ({ value: w.name, label: `${w.name}（${w.type}）` }))} />
        <Grid columns={{ minWidth: 260, max: 3 }} gap={3}>
          {weapon.marks.map((m, i) => {
            const prev = weapon.marks[i - 1];
            const g = prev ? gains(prev, m) : [];
            return (
              <Card key={m.mk} variant="default" padding={3} style={EDGE} data-mk={m.mk}>
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center"><Text type="body" weight="bold">Mk{m.mk}</Text><Text type="supporting" color="accent" weight="bold">{tierName(m.tier)}</Text></HStack>
                  <Meter label="装弾数" value={m.mag} max={MAX.mag} text={`${m.mag}`} />
                  <Meter label="射程" value={m.range} max={MAX.range} text={`${m.range} m`} />
                  <Meter label="構える時間" value={m.aim} max={MAX.aim} text={`${m.aim} ms`} />
                  {m.prereq ? <Text type="supporting" color="secondary">前提 {m.prereq}</Text> : null}
                  <Cost {...m} />
                  <Divider />
                  {!prev ? <Text type="supporting" color="placeholder">基準</Text> : g.length === 0 ? <Text type="supporting" color="secondary">この 4 つに変化なし</Text> : (
                    <VStack gap={0.5}>
                      {g.map((x) => <span key={x.label} className={x.better ? 'rr-gain' : 'rr-loss'}>{x.better ? '▲' : '▼'} {x.label} {x.before} → {x.after}{x.unit}</span>)}
                    </VStack>
                  )}
                </VStack>
              </Card>
            );
          })}
        </Grid>
      </VStack>

      <VStack as="section" id="gear-armor" className="rr-part" gap={4}>
        <VStack gap={2}>
          <Heading level={2}>防弾ベストを段で比べる</Heading>
          <Divider variant="strong" />
          <Kicker>攻略サイトの情報</Kicker>
        </VStack>
        <Grid columns={{ minWidth: 260, max: 3 }} gap={3}>
          {GEAR.armor.map((a, i) => {
            const prev = GEAR.armor[i - 1];
            return (
              <Card key={a.name} variant="default" padding={3} style={EDGE} data-armor={a.name}>
                <VStack gap={2}>
                  <HStack gap={2} vAlign="center" wrap="wrap"><Text type="body" weight="bold">{a.name}</Text><Text type="supporting" color="accent" weight="bold">{tierName(a.tier)}</Text><Text type="supporting" color="placeholder">{a.rarity}</Text></HStack>
                  <Meter label="防げる量" value={a.armor} max={100} text={`+${a.armor}`} />
                  <Meter label="区切り" value={a.segments} max={4} text={String(a.segments)} />
                  <Cost {...a} />
                  <Divider />
                  {!prev ? <Text type="supporting" color="placeholder">基準</Text> : (
                    <VStack gap={0.5}>
                      {a.armor > prev.armor ? <span className="rr-gain">▲ 防げる量 {prev.armor} → {a.armor}</span> : null}
                      {a.segments > prev.segments ? <span className="rr-gain">▲ 区切り {prev.segments} → {a.segments}</span> : null}
                      {a.block > prev.block ? <span className="rr-gain">▲ 受けるダメージ -{a.block * 100}%（出典 1 つ）</span> : null}
                    </VStack>
                  )}
                </VStack>
              </Card>
            );
          })}
        </Grid>
      </VStack>

      <VStack gap={2}>
        <Text type="supporting" color="placeholder">「初めて手にするまで」は、前提を含む解放の累計に購入 1 回を足した計算値で、土地を含みません。秒間ダメージは ダメージ × 粒数 × 連射 ÷ 60 の理論値で、命中率・距離の減衰・リロードを含みません。ショットガンは全粒が当たった場合です</Text>
        <Collapsible defaultIsOpen={false} trigger={<Text type="body" weight="bold">比較の出典と注意</Text>}>
          <VStack gap={2} paddingBlock={2}>
            <Text type="supporting" color="secondary">{GEAR.note}</Text>
            {GEAR.sources.map((s) => <Link key={s.url} href={s.url} isExternalLink color="secondary">{s.title}</Link>)}
          </VStack>
        </Collapsible>
      </VStack>
    </VStack>
  );
}
