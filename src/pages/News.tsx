import { useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { List, ListItem } from '@astryxdesign/core/List';
import { Shell } from '../components/Shell';
import { CHANGE, ChangeLabel, DISPLAY, Jst, Kicker, Tags, Version } from '../components/parts';
import { ARTICLES, TAGS, flagLabel } from '../lib/data';
import type { ChangeType } from '../lib/types';
import { jstDate } from '../lib/time';
import { url } from '../lib/url';

const TYPES: ChangeType[] = ['buff', 'nerf', 'new', 'fix', 'change'];

export function News() {
  const [tag, setTag] = useState<string | null>(null);
  const [type, setType] = useState<string>('all');
  const [q, setQ] = useState('');
  const usedTags = TAGS.filter((t) => ARTICLES.some((a) => a.tags.includes(t)));
  const items = ARTICLES
    .filter((a) => !tag || a.tags.includes(tag))
    .filter((a) => type === 'all' || a.changeTypes.includes(type as ChangeType))
    .filter((a) => !q || (a.summaryJa.headline + a.title + a.tags.join('')).toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell current="news">
      <VStack gap={2}>
        <Kicker>バックナンバー</Kicker>
        <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 40px)' }}>記事一覧</Heading>
        <Text type="body" color="secondary">公式の Steam ニュースを日本語で要約し、日本時間で載せます</Text>
      </VStack>

      {ARTICLES.length > 0 ? (
        <VStack gap={4}>
          <StackItem style={{ maxWidth: 480 }}>
            <TextInput type="search" label="キーワード" placeholder="Decoder、刑務所など" value={q} onChange={(v) => setQ(v)} />
          </StackItem>
          <VStack gap={1}>
            <Text type="label">タグ</Text>
            <HStack gap={1} wrap="wrap">
              <Button size="sm" label="すべて" variant={tag === null ? 'secondary' : 'ghost'} onClick={() => setTag(null)} />
              {usedTags.map((t) => (
                <Button key={t} size="sm" label={t} variant={tag === t ? 'secondary' : 'ghost'} onClick={() => setTag(tag === t ? null : t)} />
              ))}
            </HStack>
          </VStack>
          <VStack gap={1}>
            <Text type="label">変更の種類</Text>
            <StackItem isScrollable style={{ maxWidth: '100%' }}>
              <SegmentedControl label="変更の種類" value={type} onChange={setType}>
                <SegmentedControlItem value="all" label="すべて" />
                {TYPES.map((t) => <SegmentedControlItem key={t} value={t} label={CHANGE[t].label} icon={CHANGE[t].icon} />)}
              </SegmentedControl>
            </StackItem>
          </VStack>
        </VStack>
      ) : null}

      <VStack gap={2}>
        <Text type="supporting" hasTabularNumbers>{items.length} 件・新しい順</Text>
        <Divider variant="strong" />
        {items.length === 0 ? (
          <EmptyState
            title={ARTICLES.length === 0 ? '記事はまだありません' : 'この条件に合う記事はありません'}
            description={ARTICLES.length === 0 ? 'Steam の公式ニュースの取得と日本語の要約を準備しています' : 'タグか変更の種類を外してください'}
          />
        ) : (
          <List hasDividers edge="flush">
            {items.map((a) => {
              const flag = flagLabel(a);
              return (
                <ListItem
                  key={a.id}
                  href={url(`articles/${a.id}/`)}
                  align="first-line"
                  startContent={<StackItem style={{ width: 104 }}><Jst>{jstDate(a.publishedAt)}</Jst></StackItem>}
                  label={
                    <VStack gap={1}>
                      <HStack gap={2} wrap="wrap" vAlign="center">
                        {flag ? <Kicker>{flag}</Kicker> : null}
                        <Text type="large" weight="bold">{a.summaryJa.headline}</Text>
                      </HStack>
                      <HStack gap={4} wrap="wrap" vAlign="center">
                        {a.changeTypes.map((t) => <ChangeLabel key={t} type={t} />)}
                        <Tags tags={a.tags} />
                        <Text type="supporting" color="placeholder" hasTabularNumbers>{a.title}</Text>
                        <Version v={a.gameVersion} />
                      </HStack>
                    </VStack>
                  }
                />
              );
            })}
          </List>
        )}
      </VStack>
    </Shell>
  );
}
