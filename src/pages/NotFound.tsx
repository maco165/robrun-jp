import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Shell } from '../components/Shell';
import { Kicker } from '../components/parts';
import { url } from '../lib/url';

export function NotFound() {
  return (
    <Shell current={null}>
      <VStack gap={3}>
        <Kicker>404</Kicker>
        <Heading level={1}>ページが見つかりません</Heading>
        <Text type="body" color="secondary">記事が消えたか、URL が違います</Text>
        <Link href={url()}>トップへ</Link>
      </VStack>
    </Shell>
  );
}
