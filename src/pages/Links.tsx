import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { Shell } from '../components/Shell';
import { DISPLAY, Kicker } from '../components/parts';
import { LINKS } from '../lib/linksData';

/** links/ : 役に立つサイトの紹介 (正本は data/links.json) */
export function LinksPage() {
  return (
    <Shell current="links">
      <VStack gap={3}>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Kicker>リンク集</Kicker>
          <Text type="supporting" color="placeholder" hasTabularNumbers>{LINKS.checkedAt} 時点</Text>
        </HStack>
        <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>ROB RUN の役に立つサイト</Heading>
        <Text type="large" color="secondary">公式の窓口と、人数やサーバーを確かめられるサイトです</Text>
        <Text type="supporting" color="placeholder">{LINKS.note}</Text>
      </VStack>

      {LINKS.groups.map((g) => (
        <VStack key={g.id} as="section" gap={2}>
          <Heading level={2}>{g.title}</Heading>
          <Divider variant="strong" />
          <List hasDividers edge="flush">
            {g.items.map((e) => (
              <ListItem
                key={e.url}
                label={
                  <VStack gap={0.5}>
                    <HStack gap={3} wrap="wrap" vAlign="center">
                      <Link href={e.url} isExternalLink weight="bold">{e.name}</Link>
                      <Text type="supporting" color="placeholder">{e.lang}</Text>
                      {e.updated ? <Text type="supporting" color="placeholder" hasTabularNumbers>更新 {e.updated}</Text> : null}
                    </HStack>
                    <Text type="body" color="secondary">{e.about}</Text>
                    {e.note || e.feed ? (
                      <HStack gap={3} wrap="wrap">
                        {e.note ? <Text type="supporting" color="placeholder">{e.note}</Text> : null}
                        {e.feed ? (
                          <StackItem>
                            <Link href={e.feed} isExternalLink color="secondary">更新のフィード (RSS)</Link>
                          </StackItem>
                        ) : null}
                      </HStack>
                    ) : null}
                  </VStack>
                }
              />
            ))}
          </List>
        </VStack>
      ))}
    </Shell>
  );
}
