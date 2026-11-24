import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { Shell } from '../components/Shell';
import { ChangeLabel, DISPLAY, Jst, Kicker, Tags, Version } from '../components/parts';
import { ARTICLES, SCHEDULE, flagLabel } from '../lib/data';
import { GUIDE } from '../lib/guideData';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { guideIcon } from '../components/guideIcons';
import { jstDate, jstShort, nextOpen, remaining } from '../lib/time';
import { url } from '../lib/url';
import { useNow } from '../lib/useNow';

/** 発車案内板のような 1 行: 地域・残り時間・開放時刻 */
function Departure({ region }: { region: (typeof SCHEDULE.regions)[number] }) {
  const now = useNow();
  const target = now ? nextOpen(region, now) : null;
  return (
    <HStack gap={4} vAlign="center" wrap="wrap">
      <StackItem style={{ width: 72 }}><Text type="label" weight="bold">{region.name}</Text></StackItem>
      <Text type="display-2" hasTabularNumbers color="accent">{remaining(target, now)}</Text>
      {/* 狭い幅では時刻をいつも次の行に置く。残り時間が入った瞬間に折れて下がずれるのを防ぐ */}
      <span className="rr-departure-time"><Jst>{jstShort(target)} 開放</Jst></span>
    </HStack>
  );
}

export function Home() {
  const [latest, ...rest] = ARTICLES;
  return (
    <Shell current="top">
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Kicker>新サーバー開放まで</Kicker>
          <Text type="supporting" color="placeholder">{SCHEDULE.notes}</Text>
        </HStack>
        <Divider variant="strong" />
        {SCHEDULE.regions.map((r, i) => (
          <VStack key={r.id} gap={3}>
            {i > 0 ? <Divider /> : null}
            <Departure region={r} />
          </VStack>
        ))}
        <Divider variant="strong" />
        <Text type="supporting">
          ワイプ（Federal Raid）は開放から約 {SCHEDULE.wipeCycleDays} 日後。時刻のきまりは {SCHEDULE.updatedAt} 時点（出典: {SCHEDULE.source}）
        </Text>
      </VStack>

      <HStack gap={8} wrap="wrap" vAlign="start">
        <StackItem style={{ flex: '2 1 560px', minWidth: 0 }}>
          {latest ? (
            <VStack gap={6}>
              <VStack gap={3}>
                <HStack gap={3} wrap="wrap" vAlign="center">
                  <Kicker>最新のお知らせ</Kicker>
                  <Text type="supporting" hasTabularNumbers>{latest.title}</Text>
                  <Version v={latest.gameVersion} />
                  <Jst>{jstDate(latest.publishedAt)}</Jst>
                </HStack>
                <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>{latest.summaryJa.headline}</Heading>
                {latest.summaryJa.impact ? <Text type="large" color="secondary">{latest.summaryJa.impact}</Text> : null}
              </VStack>
              {latest.summaryJa.points.length > 0 ? (
                <VStack gap={2}>
                  <Heading level={2}>変更点</Heading>
                  <Divider variant="strong" />
                  <List hasDividers edge="flush">
                    {latest.summaryJa.points.map((c) => (
                      <ListItem
                        key={c.target + c.text}
                        align="first-line"
                        startContent={<StackItem style={{ width: 72 }}><ChangeLabel type={c.type} /></StackItem>}
                        label={
                          <VStack gap={0.5}>
                            <Text type="body" weight="bold">{c.target}</Text>
                            <Text type="body">{c.text}</Text>
                          </VStack>
                        }
                      />
                    ))}
                  </List>
                </VStack>
              ) : null}
              <HStack gap={4} wrap="wrap" vAlign="center">
                <Link href={url(`articles/${latest.id}/`)} weight="bold">記事を読む</Link>
                <Link href={latest.url} isExternalLink color="secondary">原文（英語）</Link>
              </HStack>
            </VStack>
          ) : (
            <VStack gap={3}>
              <Kicker>最新のお知らせ</Kicker>
              <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>ROB RUN の公式アップデートを、日本語と日本時間で</Heading>
              <Text type="large" color="secondary">記事はまだありません。Steam の公式ニュースの取得と日本語の要約を準備しています</Text>
            </VStack>
          )}
        </StackItem>

        <StackItem style={{ flex: '1 1 300px', minWidth: 0 }}>
          <VStack gap={2}>
            <HStack vAlign="center">
              <StackItem size="fill"><Heading level={2}>これまでのお知らせ</Heading></StackItem>
              <Link href={url('news/')}>一覧</Link>
            </HStack>
            <Divider variant="strong" />
            {rest.length === 0 ? (
              <Text type="body" color="secondary">まだありません</Text>
            ) : (
              <List hasDividers edge="flush" density="compact">
                {rest.slice(0, 5).map((a) => {
                  const flag = flagLabel(a);
                  return (
                    <ListItem
                      key={a.id}
                      href={url(`articles/${a.id}/`)}
                      label={
                        <VStack gap={0.5}>
                          <HStack gap={2} vAlign="center" wrap="wrap">
                            <Jst>{jstDate(a.publishedAt)}</Jst>
                            {flag ? <Kicker>{flag}</Kicker> : null}
                          </HStack>
                          <Text type="body" weight="medium">{a.summaryJa.headline}</Text>
                          <Tags tags={a.tags} />
                        </VStack>
                      }
                    />
                  );
                })}
              </List>
            )}
          </VStack>
        </StackItem>
      </HStack>

      {/* 攻略の入口。トップから各ジャンルへ直接たどれるようにする */}
      <VStack as="section" gap={2}>
        <HStack vAlign="center">
          <StackItem size="fill"><Heading level={2}>攻略</Heading></StackItem>
          <Link href={url('guide/')}>すべて見る</Link>
        </HStack>
        <Divider variant="strong" />
        <Grid columns={{ minWidth: 200, max: 4 }} gap={2}>
          {GUIDE.sections.map((g) => (
            <HStack key={g.id} gap={2} vAlign="center">
              <Icon icon={guideIcon(g.id)} color="accent" size="sm" />
              <Link href={url(`guide/${g.id}/`)}>{g.title}</Link>
            </HStack>
          ))}
        </Grid>
      </VStack>
    </Shell>
  );
}
