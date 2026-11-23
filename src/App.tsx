import { Theme } from '@astryxdesign/core/theme';
import { TopNav } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { robrunTheme } from './themes/robrun/robrun.js';

/** 紙面の見出し用の太い書体。サイト名と特集の見出しだけに使う */
const DISPLAY = { fontFamily: '"Dela Gothic One", "Noto Sans JP Variable", "Noto Sans JP", sans-serif', fontWeight: 400 } as const;

/** 主な目的の 4 本柱 (PJ-030 の Q-7)。中身は backlog の B-002 以降で作る */
const PILLARS = [
  { title: '公式のアップデート', body: 'Steam の公式ニュースを日本語で要約し、日本時間で載せます' },
  { title: 'ゲームについて', body: 'アーリーアクセスの状況と主な仕組みを、対象の版つきでまとめます' },
  { title: '開発会社について', body: '開発会社と公式の窓口をまとめます' },
  { title: '公開中のサーバー', body: 'いま公開されているサーバーへの外部リンクをまとめます' },
];

export default function App() {
  return (
    <Theme theme={robrunTheme} mode="dark">
      <VStack minHeight="100vh">
        <VStack paddingInline={4}>
          <TopNav
            label="メイン"
            heading={
              <HStack gap={2} vAlign="center">
                <Link href={import.meta.env.BASE_URL} color="primary">
                  <span style={{ ...DISPLAY, fontSize: 18 }}>ROB RUN 日本語アップデート</span>
                </Link>
                <Text type="supporting" color="placeholder">非公式</Text>
              </HStack>
            }
          />
        </VStack>
        <Divider />
        <VStack gap={8} paddingBlock={8} paddingInline={6} maxWidth={1200} width="100%" style={{ marginInline: 'auto', boxSizing: 'border-box' }}>
          <VStack gap={3}>
            <Text type="label" color="accent" weight="bold">【準備中】</Text>
            <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>
              ROB RUN の公式アップデートを、日本語と日本時間で
            </Heading>
            <Text type="large" color="secondary">すべての情報に、どの版のものかを添えて整理します</Text>
          </VStack>
          <VStack gap={2}>
            <Divider variant="strong" />
            {PILLARS.map((p) => (
              <VStack key={p.title} gap={1}>
                <Heading level={2}>{p.title}</Heading>
                <Text type="body" color="secondary">{p.body}</Text>
                <Divider />
              </VStack>
            ))}
          </VStack>
        </VStack>
        <Divider />
        <VStack gap={1} paddingBlock={6} paddingInline={6} maxWidth={1200} width="100%" style={{ marginInline: 'auto', boxSizing: 'border-box' }}>
          <Text type="supporting" color="placeholder">非公式のファンサイトです。開発元・販売元とは関係ありません</Text>
          <Link href="https://github.com/maco165/robrun-jp" target="_blank" color="secondary">GitHub のリポジトリ</Link>
        </VStack>
      </VStack>
    </Theme>
  );
}
