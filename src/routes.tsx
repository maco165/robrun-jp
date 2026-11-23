import type { ReactElement } from 'react';
import { Home } from './pages/Home';
import { News } from './pages/News';
import { Article } from './pages/Article';
import { NotFound } from './pages/NotFound';
import { ARTICLES, findArticle } from './lib/data';

export const SITE = 'ROB RUN 日本語アップデート';
export const ORIGIN = 'https://maco165.github.io';

export type Page = {
  /** base (/robrun-jp/) からの道。トップは ''、ほかは末尾が / */
  path: string;
  title: string;
  description: string;
  element: ReactElement;
};

const TOP: Page = {
  path: '',
  title: SITE,
  description: 'ROB RUN の公式アップデートを日本語と日本時間でまとめる非公式のファンサイト。パッチノートの要約と新サーバーの開放時刻を、対象の版つきで整理します。',
  element: <Home />,
};

const NEWS: Page = {
  path: 'news/',
  title: `記事一覧 | ${SITE}`,
  description: 'ROB RUN の公式ニュースの日本語の要約の一覧。タグ・変更の種類・キーワードで絞り込めます。',
  element: <News />,
};

export const NOT_FOUND: Page = {
  path: '404.html',
  title: `ページが見つかりません | ${SITE}`,
  description: 'ページが見つかりません。',
  element: <NotFound />,
};

/** 事前描画するページの一覧 (scripts/prerender.mjs が読む) */
export function sitePages(): Page[] {
  return [
    TOP,
    NEWS,
    ...ARTICLES.map((a) => ({
      path: `articles/${a.id}/`,
      title: `${a.summaryJa.headline} | ${SITE}`,
      description: `${a.title} (v${a.gameVersion}) の日本語の要約。${a.summaryJa.impact}`.trim(),
      element: <Article article={a} />,
    })),
  ];
}

/** base を除いた道からページを選ぶ。知らない道は 404 */
export function resolve(path: string): Page {
  // GitHub Pages は <道>/index.html にも同じ HTML を返すので、末尾の index.html を落としてから振り分ける
  const p = path.replace(/^\/+/, '').replace(/(^|\/)index\.html$/, '$1');
  if (p === '' || p === 'index.html') return TOP;
  if (p === 'news/' || p === 'news') return NEWS;
  const m = /^articles\/([A-Za-z0-9_-]+)\/?$/.exec(p);
  if (m) {
    const a = findArticle(m[1]);
    if (a) return sitePages().find((x) => x.path === `articles/${a.id}/`)!;
  }
  return NOT_FOUND;
}
