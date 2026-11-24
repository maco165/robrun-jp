import { useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Selector } from '@astryxdesign/core/Selector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Shell } from '../components/Shell';
import { DISPLAY, Kicker } from '../components/parts';
import { SENS } from '../lib/data';
import { cm360, positive, sensForCm, yawFromMeasure } from '../lib/sensitivity';

const CM = 'cm360';
const EDGE = { border: '1px solid var(--color-border-emphasized)' } as const;
const fmt = (x: number, d = 3) => (Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: d }) : '—');

/** tools/sensitivity/ : ほかのゲームの感度を ROB RUN の General Sensitivity に変換する */
export function Sensitivity() {
  const rr = SENS.robrun;
  const [game, setGame] = useState('cs2');
  const [sens, setSens] = useState<number | null>(1);
  const [dpi, setDpi] = useState<number | null>(800);
  const [rrDpi, setRrDpi] = useState<number | null>(800);
  const [cmIn, setCmIn] = useState<number | null>(40);
  const [yaw, setYaw] = useState(rr.yaw);
  const [mSens, setMSens] = useState<number | null>(rr.default);
  const [mDpi, setMDpi] = useState<number | null>(800);
  const [mCm, setMCm] = useState<number | null>(null);

  const src = SENS.games.find((g) => g.id === game);
  // 元の振り向き (cm/360)。cm/360 を直接入れた場合はそのまま
  const target = game === CM ? (positive(cmIn) ? cmIn! : Number.NaN) : src && positive(sens, dpi) ? cm360(src.yaw, sens!, dpi!) : Number.NaN;
  const out = positive(target, rrDpi) ? sensForCm(target, yaw, rrDpi!) : Number.NaN;
  const measured = positive(mSens, mDpi, mCm) ? yawFromMeasure(mSens!, mDpi!, mCm!) : Number.NaN;
  // 同じ DPI で上限 1 にしたときの最速の振り向き
  const fastest = positive(rrDpi) ? cm360(yaw, rr.max, rrDpi!) : Number.NaN;
  const options = [...SENS.games.map((g) => ({ value: g.id, label: g.name })), { value: CM, label: '振り向き (cm/360) を直接入れる' }];

  return (
    <Shell current="tools">
      <VStack gap={3}>
        <Kicker>ツール</Kicker>
        <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>ROB RUN 感度変換</Heading>
        <Text type="large" color="secondary">ほかのゲームで慣れた感度を、同じ振り向き (360 度回るのに動かすマウスの距離) になる ROB RUN の感度に変換します</Text>
      </VStack>

      <Grid columns={{ minWidth: 300, max: 2 }} gap={4}>
        <Card variant="default" padding={4} style={EDGE}>
          <VStack gap={3}>
            <Heading level={2}>いまの感度</Heading>
            <Selector label="元のゲーム" options={options} value={game} onChange={(v) => setGame(v)} hasSearch />
            {game === CM ? (
              <NumberInput label="振り向き (cm/360)" value={cmIn} onChange={setCmIn} min={0} step={0.5} />
            ) : (
              <>
                <NumberInput label={`${src?.name ?? ''} の感度`} value={sens} onChange={setSens} min={0} step={0.01} description={src?.note} />
                <NumberInput label="マウスの DPI" value={dpi} onChange={setDpi} min={0} step={50} />
              </>
            )}
            <NumberInput label="ROB RUN で使う DPI" value={rrDpi} onChange={setRrDpi} min={0} step={50} />
          </VStack>
        </Card>

        <Card variant="default" padding={4} style={{ border: '1px solid var(--color-accent)' }}>
          <VStack gap={3}>
            <Heading level={2}>ROB RUN の General Sensitivity</Heading>
            <Text type="display-1" color="accent" hasTabularNumbers aria-live="polite">{fmt(out)}</Text>
            <Text type="supporting" color="secondary" hasTabularNumbers>振り向き {fmt(target, 1)} cm/360</Text>
            {Number.isFinite(out) && out > rr.max ? (
              <Text type="supporting" color="secondary">上限の {rr.max} を超えます。この DPI では最速でも {fmt(fastest, 1)} cm/360 です。DPI を上げてください</Text>
            ) : null}
            {Number.isFinite(out) && out < rr.min ? (
              <Text type="supporting" color="secondary">下限 (0.1 とする出典がある) を下回ります。DPI を下げてください</Text>
            ) : null}
            {yaw !== rr.yaw ? <Text type="supporting" color="placeholder">自分で測った係数で計算しています</Text> : null}
            <Text type="supporting" color="placeholder">照準時 (ADS) の感度は別の設定です。まず General を合わせ、ADS は好みで調整してください</Text>
          </VStack>
        </Card>
      </Grid>

      {/* 係数・出典・測り方は常には見せず、開いたときだけ出す (本人の指示) */}
      <Divider />
      <Collapsible defaultIsOpen={false} trigger={<Text type="body" weight="bold">自分で測って係数を差し替える</Text>}>
      <VStack as="section" gap={3} paddingBlock={2}>
        <Text type="body" color="secondary">{rr.note}</Text>
        <VStack gap={1}>
          {SENS.measure.map((m, i) => (
            <HStack key={m} gap={2} vAlign="start">
              <Text type="body" color="accent" weight="bold" hasTabularNumbers>{i + 1}</Text>
              <StackItem size="fill" style={{ minWidth: 0 }}><Text type="body">{m}</Text></StackItem>
            </HStack>
          ))}
        </VStack>
        <Grid columns={{ minWidth: 180, max: 3 }} gap={3}>
          <NumberInput label="ROB RUN の感度" value={mSens} onChange={setMSens} min={0} step={0.01} />
          <NumberInput label="DPI" value={mDpi} onChange={setMDpi} min={0} step={50} />
          <NumberInput label="1 周に動かした距離 (cm)" value={mCm} onChange={setMCm} min={0} step={0.1} />
        </Grid>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Text type="body" hasTabularNumbers>測った係数 {fmt(measured, 4)} 度/カウント</Text>
          <Button label="この係数で変換する" variant="secondary" isDisabled={!Number.isFinite(measured)} onClick={() => setYaw(measured)} />
          <Button label="推定値に戻す" variant="ghost" isDisabled={yaw === rr.yaw} onClick={() => setYaw(rr.yaw)} />
        </HStack>
      </VStack>
      </Collapsible>
      <Divider />
      <Collapsible defaultIsOpen={false} trigger={<Text type="body" weight="bold">使っている係数と出典</Text>}>
      <VStack as="section" gap={2} paddingBlock={2}>
        <Text type="supporting" color="secondary">{SENS.formula.text}</Text>
        <VStack gap={2}>
          <HStack gap={3} wrap="wrap" vAlign="start">
            <StackItem style={{ width: 240 }}><Text type="body" weight="bold">ROB RUN</Text></StackItem>
            <Text type="body" hasTabularNumbers>{rr.yaw}</Text>
            <StackItem size="fill" style={{ minWidth: 0 }}><Text type="supporting" color="secondary">{rr.settings}</Text></StackItem>
          </HStack>
          {SENS.games.map((g) => (
            <HStack key={g.id} gap={3} wrap="wrap" vAlign="start">
              <StackItem style={{ width: 240 }}><Text type="body" weight="medium">{g.name}</Text></StackItem>
              <Text type="body" hasTabularNumbers>{g.yaw}</Text>
              <StackItem size="fill" style={{ minWidth: 0 }}>
                <VStack gap={0.5}>
                  {g.note ? <Text type="supporting" color="secondary">{g.note}</Text> : null}
                  <HStack gap={3} wrap="wrap">
                    {g.sources.map((s) => (
                      <Link key={s.url} href={s.url} isExternalLink color="secondary">{s.title}</Link>
                    ))}
                  </HStack>
                </VStack>
              </StackItem>
            </HStack>
          ))}
        </VStack>
        <Heading level={3}>変換に入れていないゲーム</Heading>
        {SENS.unsupported.map((u) => (
          <Text key={u.name} type="supporting" color="secondary">{u.name}: {u.reason}</Text>
        ))}
        <Heading level={3}>出典</Heading>
        <HStack gap={3} wrap="wrap">
          {[...rr.sources, ...SENS.formula.sources].map((s) => (
            <Link key={s.url} href={s.url} isExternalLink color="secondary">{s.title}</Link>
          ))}
        </HStack>
      </VStack>
      </Collapsible>
    </Shell>
  );
}
