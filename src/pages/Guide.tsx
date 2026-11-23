import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { Shell } from '../components/Shell';
import { DISPLAY, Kicker, Version } from '../components/parts';
import { GUIDE, VERSIONS, findArticle } from '../lib/data';
import { refLinks, type GuideItem, type GuideRef } from '../lib/guide';
import { newsUrl } from '../lib/steamNews';
import { jstDate } from '../lib/time';
import { url } from '../lib/url';
import { versionLabel } from '../lib/versions';
import steam from '../../data/steam.json';

/** 公式のお知らせは、サイト内の日本語の要約 (あれば) と Steam の原文の両方に飛ばす */
function RefLinks({ r }: { r: GuideRef }) {
  const links = refLinks(
    r,
    (id) => {
      const a = findArticle(id);
      return a ? { id: a.id, headline: a.summaryJa.headline } : undefined;
    },
    (id) => url(`articles/${id}/`),
    (gid) => newsUrl(steam.appid, gid),
  );
  return (
    <HStack gap={3} wrap="wrap" vAlign="center">
      {links.map((l) => (
        <Link key={l.href} href={l.href} isExternalLink={l.external} color={l.external ? 'secondary' : 'primary'}>{l.label}</Link>
      ))}
    </HStack>
  );
}

function Item({ it }: { it: GuideItem }) {
  return (
    <VStack gap={1}>
      <Text type="body">{it.text}</Text>
      <VStack gap={0.5}>
        {it.refs.map((r, i) => (
          <RefLinks key={i} r={r} />
        ))}
      </VStack>
    </VStack>
  );
}

export function Guide() {
  const g = GUIDE;
  return (
    <Shell current="guide">
      <VStack gap={3}>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Kicker>攻略</Kicker>
          <Version v={g.basedOn} />
          <Text type="supporting" color="placeholder" hasTabularNumbers>{g.updatedAt} 時点</Text>
        </HStack>
        <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>いまわかっている ROB RUN の仕組み</Heading>
        <Text type="large" color="secondary">公式のお知らせと公式ヘルプから、遊ぶうえで知っておきたいことを集めました。アーリーアクセスなので、アップデートで変わります</Text>
        <HStack gap={3} wrap="wrap">
          {g.sections.map((s) => (
            <Link key={s.id} href={`#${s.id}`} color="secondary">{s.title}</Link>
          ))}
          <Link href="#updates" color="secondary">アップデートの履歴</Link>
        </HStack>
      </VStack>

      {g.sections.map((s) => {
        const official = s.items.filter((it) => it.kind === 'official');
        const site = s.items.filter((it) => it.kind === 'site');
        return (
          <VStack key={s.id} as="section" id={s.id} gap={4}>
            <VStack gap={2}>
              <Heading level={2}>{s.title}</Heading>
              <Divider variant="strong" />
            </VStack>
            {official.length > 0 ? (
              <VStack gap={4}>
                {official.map((it, i) => (
                  <Item key={i} it={it} />
                ))}
              </VStack>
            ) : null}
            {site.length > 0 ? (
              <VStack gap={3}>
                <HStack gap={2} wrap="wrap" vAlign="center">
                  <Kicker>攻略サイトの情報</Kicker>
                  <Text type="supporting" color="placeholder">公式は数字を出していません。サイトによって値が違うことがあります</Text>
                </HStack>
                {site.map((it, i) => (
                  <Item key={i} it={it} />
                ))}
              </VStack>
            ) : null}
          </VStack>
        );
      })}

      <VStack as="section" id="updates" gap={2}>
        <Heading level={2}>アップデートの履歴</Heading>
        <Divider variant="strong" />
        <List hasDividers edge="flush" density="compact">
          {[...VERSIONS].reverse().map((v) => {
            const a = findArticle(v.sourceId);
            return (
              <ListItem
                key={v.id}
                label={
                  <HStack gap={3} wrap="wrap" vAlign="center">
                    <StackItem style={{ width: 120 }}><Text type="body" weight="medium" hasTabularNumbers>{versionLabel(v.id)}</Text></StackItem>
                    <Text type="supporting" color="placeholder" hasTabularNumbers>{jstDate(v.releasedAt)}</Text>
                    {a ? <Link href={url(`articles/${a.id}/`)}>{a.summaryJa.headline}</Link> : null}
                    <Link href={v.sourceUrl} isExternalLink color="secondary">{a ? '原文（Steam・英語）' : `${v.title}（Steam・英語）`}</Link>
                  </HStack>
                }
              />
            );
          })}
        </List>
      </VStack>
    </Shell>
  );
}
