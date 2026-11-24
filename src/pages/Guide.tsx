import { useEffect, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Shell } from '../components/Shell';
import { DISPLAY, Kicker, Version } from '../components/parts';
import { Figure, RefMarks } from '../components/figures';
import { GearCompare } from '../components/GearCompare';
import { guideIcon } from '../components/guideIcons';
import { Icon } from '@astryxdesign/core/Icon';
import { GUIDE, VERSIONS, findArticle } from '../lib/data';
import { refLinks, sourceList, type GuideItem, type GuidePart, type GuideRef, type GuideSection } from '../lib/guide';
import { newsUrl } from '../lib/steamNews';
import { jstDate } from '../lib/time';
import { url } from '../lib/url';
import { versionLabel } from '../lib/versions';
import steam from '../../data/steam.json';

const findForGuide = (id: string) => {
  const a = findArticle(id);
  return a ? { id: a.id, headline: a.summaryJa.headline } : undefined;
};

/** 出典 1 件の行。公式のお知らせは、サイト内の要約の記事 (あれば) と Steam の原文の両方へ */
function SourceRow({ n, r }: { n: number; r: GuideRef }) {
  const links = refLinks(r, findForGuide, (id) => url(`articles/${id}/`), (gid) => newsUrl(steam.appid, gid));
  const kind = 'news' in r ? '公式のお知らせ' : 'help' in r ? '公式ヘルプ' : '攻略サイト';
  return (
    <HStack gap={3} vAlign="start">
      <StackItem style={{ width: 32, flexShrink: 0 }}>
        <Text type="supporting" color="placeholder" hasTabularNumbers>[{n}]</Text>
      </StackItem>
      <StackItem size="fill" style={{ minWidth: 0 }}>
        <VStack gap={0.5}>
          <Text type="supporting" color="placeholder">{kind}</Text>
          <HStack gap={3} wrap="wrap" vAlign="center">
            {links.map((l) => (
              <Link key={l.href} href={l.href} isExternalLink={l.external} color={l.external ? 'secondary' : 'primary'}>{l.label}</Link>
            ))}
          </HStack>
        </VStack>
      </StackItem>
    </HStack>
  );
}

function Header({ kicker, title, lead }: { kicker: string; title: string; lead: string }) {
  return (
    <VStack gap={3}>
      <HStack gap={3} wrap="wrap" vAlign="center">
        <Kicker>{kicker}</Kicker>
        <Version v={GUIDE.basedOn} />
        <Text type="supporting" color="placeholder" hasTabularNumbers>{GUIDE.updatedAt} 時点</Text>
      </HStack>
      <Heading level={1} style={{ ...DISPLAY, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.3 }}>{title}</Heading>
      <Text type="large" color="secondary">{lead}</Text>
    </VStack>
  );
}

function Items({ list, numberOf }: { list: GuideItem[]; numberOf: (r: GuideRef) => number }) {
  return (
    <VStack as="ul" gap={3} style={{ margin: 0, paddingInlineStart: 20 }}>
      {list.map((it, k) => (
        <li key={k}>
          <Text type="body">{it.text}</Text>
          <RefMarks refs={it.refs} numberOf={numberOf} />
        </li>
      ))}
    </VStack>
  );
}

/** ページの中の見出し 1 つ分: 図・くわしく */
function Part({ p, numberOf }: { p: GuidePart; numberOf: (r: GuideRef) => number }) {
  const official = p.items.filter((it) => it.kind === 'official');
  const site = p.items.filter((it) => it.kind === 'site');
  return (
    <VStack as="section" id={p.id} className="rr-part" gap={6}>
      <VStack gap={2}>
        <Heading level={2}>{p.title}</Heading>
        <Divider variant="strong" />
      </VStack>
      {p.figures.map((f, k) => <Figure key={k} f={f} numberOf={numberOf} />)}
      <VStack gap={3}>
        {official.length > 0 ? <Items list={official} numberOf={numberOf} /> : null}
        {site.length > 0 ? (
          <VStack gap={3}>
            <HStack gap={2} wrap="wrap" vAlign="center">
              <Kicker>攻略サイトの情報</Kicker>
              <Text type="supporting" color="placeholder">公式は数字を出していません。サイトによって値が違うことがあります</Text>
            </HStack>
            <Items list={site} numberOf={numberOf} />
          </VStack>
        ) : null}
      </VStack>
    </VStack>
  );
}

/** guide/ : ジャンルの入口とアップデートの履歴 */
export function GuideIndex() {
  return (
    <Shell current="guide">
      <Header
        kicker="攻略"
        title="いまわかっている ROB RUN の仕組み"
        lead="公式のお知らせと公式ヘルプを中心に、ジャンルごとに図と表でまとめました。攻略サイトの情報は印を付けて分けています。アーリーアクセスなので、アップデートで変わります"
      />
      <Grid columns={{ minWidth: 260, max: 3 }} gap={3}>
        {GUIDE.sections.map((s, i) => (
          <ClickableCard key={s.id} label={s.title} href={url(`guide/${s.id}/`)} padding={4} style={{ border: '1px solid var(--color-border-emphasized)' }}>
            <VStack gap={2}>
              <HStack gap={2} vAlign="center">
                <Icon icon={guideIcon(s.id)} color="accent" />
                <Text type="label" color="accent" hasTabularNumbers style={{ ...DISPLAY, fontSize: 18 }}>{String(i + 1).padStart(2, '0')}</Text>
              </HStack>
              <Heading level={2}>{s.title}</Heading>
              <Text type="supporting" color="secondary">{s.summary}</Text>
              <Text type="supporting" color="placeholder" hasTabularNumbers>{s.parts.map((p) => p.title).join('・')}</Text>
            </VStack>
          </ClickableCard>
        ))}
      </Grid>

      <VStack as="section" gap={2}>
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

/** guide/<ジャンル>/ : 図・本文・出典の一覧 (出典は末尾に 1 回ずつ、本文と図は番号だけ) */
export function GuideGenre({ section: s }: { section: GuideSection }) {
  const { refs, numberOf } = sourceList({ figures: s.parts.flatMap((p) => p.figures), items: s.parts.flatMap((p) => p.items) });
  const [srcOpen, setSrcOpen] = useState(false);
  const [jump, setJump] = useState<string | null>(null);
  // [n] (href="#src-n") を押したとき・その URL で開いたときは、出典を開いてから行へ移る
  useEffect(() => {
    const fromHash = () => {
      if (location.hash.startsWith('#src-')) {
        setSrcOpen(true);
        setJump(location.hash.slice(1));
      }
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#src-"]');
      if (!a) return;
      e.preventDefault();
      const id = a.getAttribute('href')!.slice(1);
      history.replaceState(null, '', `#${id}`);
      setSrcOpen(true);
      setJump(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', onClick);
    };
  }, []);
  useEffect(() => {
    if (!srcOpen || !jump) return;
    const t = window.setTimeout(() => {
      document.getElementById(jump)?.scrollIntoView({ block: 'start' });
      setJump(null);
    }, 50);
    return () => window.clearTimeout(t);
  }, [srcOpen, jump]);
  const i = GUIDE.sections.findIndex((x) => x.id === s.id);
  const prev = GUIDE.sections[i - 1];
  const next = GUIDE.sections[i + 1];
  return (
    <Shell current="guide">
      <StackItem crossAlignSelf="start">
        <Link href={url('guide/')} color="secondary">攻略の一覧へ戻る</Link>
      </StackItem>
      <Header kicker={`攻略 ${String(i + 1).padStart(2, '0')}`} title={s.title} lead={s.summary} />
      {/* イメージ画像 (scripts/make-guide-images.tsx が描く。公式の画像は使わない) */}
      <img
        src={url(`img/guide-${s.id}.png`)}
        alt={`ROB RUN 攻略「${s.title}」のイメージ`}
        width={1600}
        height={400}
        loading="eager"
        style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }}
      />

      {s.id === 'gear' ? (
        <HStack as="nav" gap={4} wrap="wrap" aria-label="このページの見出し">
          <Link href="#gear-tier">段で比べる</Link><Link href="#gear-mk">Mk で比べる</Link><Link href="#gear-armor">防具</Link><Link href="#weapons">きまり</Link>
        </HStack>
      ) : null}
      {s.parts.length > 1 ? (
        <HStack as="nav" gap={4} wrap="wrap" aria-label="このページの見出し">
          {s.parts.map((p) => <Link key={p.id} href={`#${p.id}`}>{p.title}</Link>)}
        </HStack>
      ) : null}

      {s.id === 'gear' ? <GearCompare /> : null}
      {s.parts.map((p) => <Part key={p.id} p={p} numberOf={numberOf} />)}

      {/* 出典は常には見せず、開いたときだけ出す (本人の指示)。本文と図の [n] を押すと開いてその行へ移る */}
      <VStack as="section" gap={2}>
        <Divider variant="strong" />
        <Collapsible isOpen={srcOpen} onOpenChange={setSrcOpen} trigger={<Heading level={2}>出典 ({refs.length} 件)</Heading>}>
          <VStack gap={3} paddingBlock={2}>
            {refs.map((r, k) => (
              <VStack key={k} id={`src-${k + 1}`}>
                <SourceRow n={k + 1} r={r} />
              </VStack>
            ))}
          </VStack>
        </Collapsible>
      </VStack>

      <HStack gap={4} wrap="wrap">
        {prev ? <Link href={url(`guide/${prev.id}/`)} color="secondary">← {prev.title}</Link> : null}
        <StackItem size="fill" />
        {next ? <Link href={url(`guide/${next.id}/`)} color="secondary">{next.title} →</Link> : null}
      </HStack>
    </Shell>
  );
}
