import type { ReactNode } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { List, ListItem } from '@astryxdesign/core/List';
import { Shell } from '../components/Shell';
import { ChangeLabel, DISPLAY, Jst, Kicker, Tags, Version } from '../components/parts';
import { ARTICLES, flagLabel } from '../lib/data';
import type { Article as ArticleData } from '../lib/types';
import { jstFull, jstShort, utcFull } from '../lib/time';
import { url } from '../lib/url';

export function Article({ article }: { article: ArticleData }) {
  const a = article;
  const flag = flagLabel(a);
  const i = ARTICLES.findIndex((x) => x.id === a.id);
  const older = ARTICLES[i + 1];
  const meta: { label: string; value: ReactNode }[] = [
    { label: '公開（日本時間）', value: <Jst>{jstFull(a.publishedAt)}</Jst> },
    { label: '公開（UTC）', value: <Text type="supporting" hasTabularNumbers>{utcFull(a.publishedAt)}</Text> },
    { label: '対象の版', value: <Version v={a.gameVersion} /> },
  ];
  return (
    <Shell current="news">
      <StackItem crossAlignSelf="start">
        <Link href={url('news/')} color="secondary">記事一覧へ戻る</Link>
      </StackItem>

      <HStack gap={8} wrap="wrap" vAlign="start">
        <StackItem style={{ flex: '2 1 560px', minWidth: 0 }}>
          <VStack as="article" gap={8}>
            <VStack gap={3}>
              <HStack gap={3} wrap="wrap" vAlign="center">
                <Kicker>{flag ?? 'お知らせ'}</Kicker>
                <Text type="supporting" hasTabularNumbers>{a.title}</Text>
                <Version v={a.gameVersion} />
                <Jst>{jstShort(new Date(a.publishedAt))}</Jst>
              </HStack>
              <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>{a.summaryJa.headline}</Heading>
              {a.summaryJa.impact ? <Text type="large" color="secondary">{a.summaryJa.impact}</Text> : null}
              <Tags tags={a.tags} />
            </VStack>

            {a.summaryJa.points.length > 0 ? (
              <VStack gap={2}>
                <HStack gap={2} wrap="wrap" vAlign="end">
                  <StackItem size="fill"><Heading level={2}>変更点</Heading></StackItem>
                  <Text type="supporting" color="placeholder">アイテム名はゲーム画面に合わせて英語のまま</Text>
                </HStack>
                <Divider variant="strong" />
                <List hasDividers edge="flush">
                  {a.summaryJa.points.map((c) => (
                    <ListItem
                      key={c.target + c.text}
                      align="first-line"
                      startContent={<StackItem style={{ width: 72 }}><ChangeLabel type={c.type} /></StackItem>}
                      label={
                        <VStack gap={0.5}>
                          <Text type="body"><Text type="inherit" weight="bold">{c.target}</Text>　{c.text}</Text>
                          {c.before !== undefined && c.after !== undefined ? (
                            <Text type="supporting" hasTabularNumbers>{c.field ? `${c.field}：` : ''}{c.before} → <Text type="inherit" color="accent" weight="bold">{c.after}</Text></Text>
                          ) : null}
                        </VStack>
                      }
                    />
                  ))}
                </List>
              </VStack>
            ) : null}

            {older ? (
              <VStack gap={1}>
                <Divider />
                <Text type="supporting" color="placeholder">前の記事</Text>
                <Link href={url(`articles/${older.id}/`)} weight="bold">{older.summaryJa.headline}</Link>
              </VStack>
            ) : null}
          </VStack>
        </StackItem>

        <StackItem style={{ flex: '1 1 280px', minWidth: 0 }}>
          <VStack gap={2}>
            <Heading level={2}>この記事について</Heading>
            <Divider variant="strong" />
            <List hasDividers edge="flush" density="compact">
              {meta.map((m) => (
                <ListItem key={m.label} label={<VStack gap={0.5}><Text type="supporting" color="placeholder">{m.label}</Text>{m.value}</VStack>} />
              ))}
            </List>
            {/* 出典 (原文) と要約の主体は常には見せず、開いたときだけ出す (本人の指示) */}
            <Divider />
            <Collapsible defaultIsOpen={false} trigger={<Text type="body" weight="bold">出典</Text>}>
              <VStack gap={2} paddingBlock={2}>
                <VStack gap={0.5}>
                  <Text type="supporting" color="placeholder">原文</Text>
                  <Link href={a.url} isExternalLink>{a.title}（{a.source === 'official' ? 'Steam・英語' : '外部サイト'}）</Link>
                </VStack>
                <VStack gap={0.5}>
                  <Text type="supporting" color="placeholder">要約</Text>
                  <Text type="supporting">{a.summarizedBy === 'ai' ? 'AI が作成' : '人が作成'}</Text>
                </VStack>
              </VStack>
            </Collapsible>
          </VStack>
        </StackItem>
      </HStack>
    </Shell>
  );
}
