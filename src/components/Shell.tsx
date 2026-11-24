import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { robrunTheme } from '../themes/robrun/robrun.js';
import { DISPLAY } from './parts';
import { url } from '../lib/url';
import { BookOpen, House, Link2, MousePointer2, Newspaper, type LucideIcon } from 'lucide-react';

export type NavKey = 'top' | 'news' | 'guide' | 'tools' | 'links' | null;

/** 上のメニュー。short はスマホの 5 等分のタブに入る短い名前 */
const NAV: { key: Exclude<NavKey, null>; label: string; short: string; path: string; icon: LucideIcon }[] = [
  { key: 'top', label: 'ホーム', short: 'ホーム', path: '', icon: House },
  { key: 'news', label: '記事一覧', short: '記事', path: 'news/', icon: Newspaper },
  { key: 'guide', label: '攻略', short: '攻略', path: 'guide/', icon: BookOpen },
  { key: 'tools', label: '感度変換', short: '感度', path: 'tools/sensitivity/', icon: MousePointer2 },
  { key: 'links', label: 'リンク集', short: 'リンク', path: 'links/', icon: Link2 },
];

const FRAME = { marginInline: 'auto', boxSizing: 'border-box' } as const;

export function Shell({ current, children }: { current: NavKey; children: ReactNode }) {
  return (
    <Theme theme={robrunTheme} mode="dark">
      <VStack minHeight="100vh">
        {/* 上のメニュー。幅が狭いと名前の下に 5 等分のタブで 1 行に並ぶ (src/styles.css の .rr-header)。スクロールしても上に残る */}
        <header className="rr-header">
          <div className="rr-header-inner">
            <a className="rr-brand" href={url()}>
              <span style={DISPLAY}>ROB RUN 日本語アップデート</span>
              <span className="rr-brand-note">非公式</span>
            </a>
            <nav className="rr-nav" aria-label="メイン">
              {NAV.map((n) => {
                const Icon = n.icon;
                const on = n.key === current;
                return (
                  <a key={n.key} className="rr-nav-item" href={url(n.path)} aria-current={on ? 'page' : undefined}>
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span className="rr-nav-label">{n.label}</span>
                    <span className="rr-nav-short" aria-hidden="true">{n.short}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </header>
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
