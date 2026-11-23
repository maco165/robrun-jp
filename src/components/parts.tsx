import type { ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import { Plus, ArrowLeftRight } from 'lucide-react';
import type { ChangeType } from '../lib/types';
import { versionLabel } from '../lib/versions';
import { isOldVersion } from '../lib/data';

/** 紙面の見出し用の太い書体。サイト名と特集の見出しだけに使う */
export const DISPLAY = { fontFamily: '"Dela Gothic One", "Noto Sans JP Variable", "Noto Sans JP", sans-serif', fontWeight: 400 } as const;

export const CHANGE: Record<ChangeType, { label: string; icon: ReactNode }> = {
  buff: { label: 'バフ', icon: <Icon icon="arrowUp" color="success" size="sm" /> },
  nerf: { label: 'ナーフ', icon: <Icon icon="arrowDown" color="error" size="sm" /> },
  new: { label: '新要素', icon: <Icon icon={Plus} color="info" size="sm" /> },
  fix: { label: '修正', icon: <Icon icon="check" color="secondary" size="sm" /> },
  change: { label: '変更', icon: <Icon icon={ArrowLeftRight} color="secondary" size="sm" /> },
};

/** 変更の種類は札にせず、線のアイコンと文字だけ */
export function ChangeLabel({ type }: { type: ChangeType }) {
  const c = CHANGE[type];
  return (
    <HStack gap={1} vAlign="center">
      {c.icon}
      <Text type="supporting" color="secondary">{c.label}</Text>
    </HStack>
  );
}

/** 雑誌の囲み見出しのような【ワイプ】の文字 */
export function Kicker({ children }: { children: ReactNode }) {
  return <Text type="label" color="accent" weight="bold">【{children}】</Text>;
}

/** タグは色を付けない文字 */
export function Tags({ tags }: { tags: string[] }) {
  return <Text type="supporting" color="placeholder">{tags.join('／')}</Text>;
}

/** 時刻はどこでも等幅の数字で書き、後ろに小さく JST を添える */
export function Jst({ children }: { children: ReactNode }) {
  return (
    <Text type="supporting" hasTabularNumbers>
      {children}
      <Text type="supporting" size="2xs" color="placeholder"> JST</Text>
    </Text>
  );
}

/** 版。アーリーアクセスなので、どの版の情報かをどこにでも添える (PJ-030 の Q-9)。いまの版より古ければ【古い版の情報】を並べる */
export function Version({ v }: { v: string }) {
  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      <Text type="supporting" color="secondary" hasTabularNumbers>{versionLabel(v)}</Text>
      {isOldVersion(v) ? <Kicker>古い版の情報</Kicker> : null}
    </HStack>
  );
}
