import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { robrunTheme } from '../themes/robrun/robrun.js';
import { DISPLAY } from './parts';
import { url } from '../lib/url';

export type NavKey = 'top' | 'news' | 'guide' | null;

const NAV: { key: Exclude<NavKey, null>; label: string; path: string }[] = [
  { key: 'top', label: '最新', path: '' },
  { key: 'news', label: '記事一覧', path: 'news/' },
  { key: 'guide', label: '攻略', path: 'guide/' },
];

const FRAME = { marginInline: 'auto', boxSizing: 'border-box' } as const;

export function Shell({ current, children }: { current: NavKey; children: ReactNode }) {
  return (
    <Theme theme={robrunTheme} mode="dark">
      <VStack minHeight="100vh">
        <VStack paddingInline={4}>
          <TopNav
            label="メイン"
            heading={
              <HStack gap={2} vAlign="center">
                <Link href={url()} color="primary">
                  <span style={{ ...DISPLAY, fontSize: 18 }}>ROB RUN 日本語アップデート</span>
                </Link>
                <Text type="supporting" color="placeholder">非公式</Text>
              </HStack>
            }
            endContent={
              <HStack gap={4} vAlign="center" wrap="wrap">
                {NAV.map((n) => (
                  <Link key={n.key} href={url(n.path)} color={n.key === current ? 'primary' : 'secondary'} weight={n.key === current ? 'medium' : 'normal'}>
                    {n.label}
                  </Link>
                ))}
              </HStack>
            }
          />
        </VStack>
        <Divider />
        <VStack as="main" gap={8} paddingBlock={8} paddingInline={6} maxWidth={1200} width="100%" style={FRAME}>
          {children}
        </VStack>
        <Divider />
        <VStack as="footer" gap={1} paddingBlock={6} paddingInline={6} maxWidth={1200} width="100%" style={FRAME}>
          <Text type="supporting" color="placeholder">非公式のファンサイトです。開発元・販売元とは関係ありません</Text>
          <Link href="https://github.com/maco165/robrun-jp" target="_blank" color="secondary">GitHub のリポジトリ</Link>
        </VStack>
      </VStack>
    </Theme>
  );
}
