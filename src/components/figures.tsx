// 攻略ページの図。データは data/guide.json の figures (正本)。図ごとに出所の種類と出典の番号を添える
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { Table } from '@astryxdesign/core/Table';
import { X, Check } from 'lucide-react';
import { DISPLAY, Kicker } from './parts';
import type { GuideFigure, GuideRef } from '../lib/guide';

/** 図の枠。テーマは面を平らにして枠線の太さを 0 にしているので、図の箱だけ線を書く */
const EDGE = { border: '1px solid var(--color-border-emphasized)' } as const;

/** 本文と図に付ける出典の番号。押すとページの末尾の出典の一覧へ飛ぶ */
export function RefMarks({ refs, numberOf }: { refs: GuideRef[]; numberOf: (r: GuideRef) => number }) {
  const nums = [...new Set(refs.map(numberOf))].sort((a, b) => a - b);
  return (
    <Text type="supporting" size="xsm" color="placeholder" hasTabularNumbers>
      {nums.map((n) => (
        <a key={n} href={`#src-${n}`} style={{ color: 'inherit', textDecoration: 'none', marginInlineStart: 2 }} aria-label={`出典 ${n}`}>
          [{n}]
        </a>
      ))}
    </Text>
  );
}

function Flow({ steps }: { steps: { title: string; note: string }[] }) {
  return (
    <Grid columns={{ minWidth: 150, max: steps.length }} gap={2}>
      {steps.map((s, i) => (
        <Card key={i} variant="default" padding={3} style={EDGE}>
          <VStack gap={1}>
            {/* 順は番号で示す。狭い幅では折り返すので、右向きの矢印は付けない */}
            <Text type="label" color="accent" hasTabularNumbers style={{ ...DISPLAY, fontSize: 20 }}>{i + 1}</Text>
            <Text type="body" weight="bold">{s.title}</Text>
            <Text type="supporting" color="secondary">{s.note}</Text>
          </VStack>
        </Card>
      ))}
    </Grid>
  );
}

/** 上ほど狭い段。上の段ほど力が強い */
function Pyramid({ tiers }: { tiers: { title: string; note: string }[] }) {
  const n = tiers.length;
  return (
    <VStack gap={1} hAlign="center">
      {tiers.map((t, i) => (
        <StackItem key={i} style={{ width: `${Math.round(44 + (56 * i) / Math.max(1, n - 1))}%`, minWidth: 0 }}>
          <Card variant="default" padding={2} style={i === 0 ? { border: '1px solid var(--color-accent)' } : EDGE}>
            <VStack gap={0} hAlign="center">
              <Text type="body" weight="bold" color={i === 0 ? 'accent' : 'primary'} style={{ textAlign: 'center' }}>{t.title}</Text>
              <Text type="supporting" color="secondary" style={{ textAlign: 'center' }}>{t.note}</Text>
            </VStack>
          </Card>
        </StackItem>
      ))}
    </VStack>
  );
}

/** 1 系列の横棒。値は棒の右に文字で書く (色だけで読ませない) */
function Bars({ bars, unit }: { bars: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <VStack gap={2} role="img" aria-label={bars.map((b) => `${b.label} ${b.value}${unit}`).join('、')}>
      {bars.map((b) => (
        <HStack key={b.label} gap={3} vAlign="center">
          <StackItem style={{ width: 64, flexShrink: 0 }}><Text type="supporting" color="secondary">{b.label}</Text></StackItem>
          <StackItem size="fill" style={{ minWidth: 0 }}>
            <HStack gap={2} vAlign="center">
              {b.value > 0 ? (
                <span title={`${b.label}: +${b.value}${unit}`} style={{ display: 'block', height: 16, width: `${(b.value / max) * 85}%`, background: 'var(--color-accent)', borderRadius: '0 4px 4px 0' }} />
              ) : (
                <span style={{ display: 'block', height: 16, width: 2, background: 'var(--color-border-emphasized)' }} />
              )}
              <Text type="supporting" hasTabularNumbers weight="medium">+{b.value}{unit}</Text>
            </HStack>
          </StackItem>
        </HStack>
      ))}
    </VStack>
  );
}

function Split({ columns }: { columns: { title: string; tone: 'lose' | 'keep'; items: string[] }[] }) {
  return (
    <Grid columns={{ minWidth: 200, max: columns.length }} gap={2}>
      {columns.map((c) => (
        <Card key={c.title} variant="default" padding={3} style={EDGE}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center">
              <Icon icon={c.tone === 'lose' ? X : Check} size="sm" color={c.tone === 'lose' ? 'error' : 'success'} />
              <Text type="body" weight="bold">{c.title}</Text>
            </HStack>
            {c.items.map((x) => (
              <Text key={x} type="body" color="secondary">{x}</Text>
            ))}
          </VStack>
        </Card>
      ))}
    </Grid>
  );
}

function FigTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  const data = rows.map((r, i) => ({ id: String(i), ...Object.fromEntries(r.map((c, j) => [`c${j}`, c])) }));
  return (
    <Table
      data={data}
      idKey="id"
      columns={columns.map((h, j) => ({
        key: `c${j}`,
        header: h,
        renderCell: (row: Record<string, string>) => <Text type="body" weight={j === 0 ? 'medium' : 'normal'}>{row[`c${j}`]}</Text>,
      }))}
    />
  );
}

export function Figure({ f, numberOf }: { f: GuideFigure; numberOf: (r: GuideRef) => number }) {
  return (
    <VStack as="figure" gap={3} style={{ margin: 0 }}>
      <HStack gap={2} wrap="wrap" vAlign="center">
        <Heading level={3}>{f.title}</Heading>
        {f.kind === 'site' ? <Kicker>攻略サイトの情報</Kicker> : null}
        <RefMarks refs={f.refs} numberOf={numberOf} />
      </HStack>
      {f.type === 'flow' ? <Flow steps={f.steps} /> : null}
      {f.type === 'pyramid' ? <Pyramid tiers={f.tiers} /> : null}
      {f.type === 'bars' ? <Bars bars={f.bars} unit={f.unit} /> : null}
      {f.type === 'split' ? <Split columns={f.columns} /> : null}
      {f.type === 'table' ? <FigTable columns={f.columns} rows={f.rows} /> : null}
      {f.note ? <Text as="p" type="supporting" color="placeholder">{f.note}</Text> : null}
    </VStack>
  );
}
