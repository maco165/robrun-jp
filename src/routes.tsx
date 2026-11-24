import type { ReactElement } from 'react';
import { Home } from './pages/Home';
import { News } from './pages/News';
import { Article } from './pages/Article';
import { NotFound } from './pages/NotFound';
import { GuideGenre, GuideIndex } from './pages/Guide';
import { LinksPage } from './pages/Links';
import { Sensitivity } from './pages/Sensitivity';
import { ARTICLES, GUIDE, findArticle } from './lib/data';
import { versionLabel } from './lib/versions';

export const SITE = 'ROB RUN 日本語アップデート';
export const ORIGIN = 'https://maco165.github.io';

export type Page = {
  /** base (/robrun-jp/) からの道。トップは ''、ほかは末尾が / */
  path: string;
  title: string;
  description: string;
  element: ReactElement;
  /** OGP の og:type */
  ogType: 'website' | 'article';
  /** 共有の画像 (og:image)。base からの道と代替文字。無ければ全体の og.png */
  image?: { path: string; alt: string };
  /** 構造化データ (JSON-LD)。無ければ書かない */
  jsonLd?: Record<string, unknown>;
};

const SITE_URL = `${ORIGIN}/robrun-jp/`;
const PUBLISHER = { '@type': 'Organization', name: SITE, url: SITE_URL };

/** パンくず (ホーム > 攻略 > ジャンル) の構造化データ */
const crumbs = (list: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
});

const TOP: Page = {
  path: '',
  title: SITE,
  description: 'ROB RUN の公式アップデートを日本語と日本時間でまとめる非公式のファンサイト。パッチノートの要約と新サーバーの開放時刻を、対象の版つきで整理します。',
  element: <Home />,
  ogType: 'website',
  jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: SITE_URL, inLanguage: 'ja', description: 'ROB RUN の公式アップデートを日本語と日本時間でまとめる非公式のファンサイト' },
};

const NEWS: Page = {
  path: 'news/',
  title: `記事一覧 | ${SITE}`,
  description: 'ROB RUN の公式ニュースの日本語の要約の一覧。タグ・変更の種類・キーワードで絞り込めます。',
  element: <News />,
  ogType: 'website',
};

const GUIDE_PAGE: Page = {
  path: 'guide/',
  title: `攻略: いまわかっている仕組み | ${SITE}`,
  description: 'ROB RUN の換金・悪名・拠点・地区・警察・ワイプなど、いまわかっている仕組みを公式のお知らせと公式ヘルプを中心に、ジャンルごとに図と表でまとめた攻略ページ。元のアップデート情報へのリンクつき。',
  element: <GuideIndex />,
  ogType: 'website',
  image: { path: 'img/og-guide.png', alt: 'ROB RUN 攻略: いまわかっている仕組みをジャンル別に図と表で' },
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: 'ROB RUN 攻略', url: `${SITE_URL}guide/`, inLanguage: 'ja', isPartOf: { '@type': 'WebSite', name: SITE, url: SITE_URL } },
      crumbs([{ name: 'ホーム', path: '' }, { name: '攻略', path: 'guide/' }]),
    ],
  },
};

const LINKS_PAGE: Page = {
  path: 'links/',
  title: `ROB RUN のリンク集: 攻略 wiki・データ・YouTube | ${SITE}`,
  description: 'ROB RUN の公式の窓口と、攻略 wiki・データサイト・YouTube を、何が強いかと更新日つきで紹介するリンク集。',
  element: <LinksPage />,
  ogType: 'website',
  jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', name: 'ROB RUN のリンク集', url: `${SITE_URL}links/`, inLanguage: 'ja' }, crumbs([{ name: 'ホーム', path: '' }, { name: 'リンク集', path: 'links/' }])] },
};

const SENS_PAGE: Page = {
  path: 'tools/sensitivity/',
  title: `ROB RUN 感度変換: CS2・VALORANT・Rust などから | ${SITE}`,
  description: 'CS2・VALORANT・Apex・Overwatch 2・Fortnite・Rust などの感度を、同じ振り向き (cm/360) になる ROB RUN の感度に変換するツール。係数の出典と自分で測る方法つき。',
  element: <Sensitivity />,
  ogType: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebApplication', name: 'ROB RUN 感度変換', url: `${SITE_URL}tools/sensitivity/`, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', inLanguage: 'ja', offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' } },
      crumbs([{ name: 'ホーム', path: '' }, { name: '感度変換', path: 'tools/sensitivity/' }]),
    ],
  },
};

export const NOT_FOUND: Page = {
  path: '404.html',
  title: `ページが見つかりません | ${SITE}`,
  description: 'ページが見つかりません。',
  element: <NotFound />,
  ogType: 'website',
};

/** 事前描画するページの一覧 (scripts/prerender.mjs が読む) */
export function sitePages(): Page[] {
  return [
    TOP,
    NEWS,
    GUIDE_PAGE,
    LINKS_PAGE,
    SENS_PAGE,
    ...GUIDE.sections.map((g) => ({
      path: `guide/${g.id}/`,
      title: `ROB RUN 攻略: ${g.title} | ${SITE}`,
      description: `ROB RUN の攻略: ${g.title}。${g.summary}。公式のお知らせと公式ヘルプを中心に、図と表でまとめています。`,
      element: <GuideGenre section={g} />,
      ogType: 'article' as const,
      image: { path: `img/og-guide-${g.id}.png`, alt: `ROB RUN 攻略「${g.title}」: ${g.summary}` },
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: `ROB RUN 攻略: ${g.title}`,
            description: g.summary,
            inLanguage: 'ja',
            dateModified: `${GUIDE.updatedAt}T00:00:00+09:00`,
            mainEntityOfPage: `${SITE_URL}guide/${g.id}/`,
            image: `${SITE_URL}img/og-guide-${g.id}.png`,
            author: PUBLISHER,
            publisher: PUBLISHER,
            about: { '@type': 'VideoGame', name: 'ROB RUN', url: 'https://store.steampowered.com/app/4262460/' },
          },
          crumbs([{ name: 'ホーム', path: '' }, { name: '攻略', path: 'guide/' }, { name: g.title, path: `guide/${g.id}/` }]),
        ],
      },
    })),
    ...ARTICLES.map((a) => ({
      path: `articles/${a.id}/`,
      title: `${a.summaryJa.headline} | ${SITE}`,
      description: `${a.title} (${versionLabel(a.gameVersion)}) の日本語の要約。${a.summaryJa.impact}`.trim(),
      element: <Article article={a} />,
      ogType: 'article' as const,
      // 要約の記事。元の記事 (原文) を isBasedOn で指す
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: a.summaryJa.headline,
        description: a.summaryJa.impact || undefined,
        datePublished: a.publishedAt,
        inLanguage: 'ja',
        mainEntityOfPage: `${SITE_URL}articles/${a.id}/`,
        isBasedOn: a.url,
        image: `${SITE_URL}og.png`,
        author: PUBLISHER,
        publisher: PUBLISHER,
      },
    })),
  ];
}

/** base を除いた道からページを選ぶ。知らない道は 404 */
export function resolve(path: string): Page {
  // GitHub Pages は <道>/index.html にも同じ HTML を返すので、末尾の index.html を落としてから振り分ける
  const p = path.replace(/^\/+/, '').replace(/(^|\/)index\.html$/, '$1');
  if (p === '' || p === 'index.html') return TOP;
  if (p === 'news/' || p === 'news') return NEWS;
  if (p === 'guide/' || p === 'guide') return GUIDE_PAGE;
  if (p === 'links/' || p === 'links') return LINKS_PAGE;
  if (p === 'tools/sensitivity/' || p === 'tools/sensitivity') return SENS_PAGE;
  const gm = /^guide\/([a-z0-9-]+)\/?$/.exec(p);
  if (gm && GUIDE.sections.some((g) => g.id === gm[1])) return sitePages().find((x) => x.path === `guide/${gm[1]}/`)!;
  const m = /^articles\/([A-Za-z0-9_-]+)\/?$/.exec(p);
  if (m) {
    const a = findArticle(m[1]);
    if (a) return sitePages().find((x) => x.path === `articles/${a.id}/`)!;
  }
  return NOT_FOUND;
}
