// 記事は @news から読む。@news は既定で data/news.json、e2e では ROBRUN_NEWS の見本 (tests/fixtures/news.json) を指す (vite.config.ts)
import news from '@news';
import schedule from '../../data/schedule.json';
import versions from '../../data/versions.json';
import guide from '../../data/guide.json';
import gear from '../../data/gear.json';
import type { Gear } from './gear';
import links from '../../data/links.json';
import sensitivity from '../../data/sensitivity.json';
import type { SensData } from './sensitivity';
import type { Links } from './links';
import type { Guide } from './guide';
import { isOlder, latestVersion, type Version } from './versions';
import type { Article, Schedule } from './types';

/** 新しい順 */
export const ARTICLES: Article[] = [...(news as Article[])].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
export const SCHEDULE = schedule as Schedule;
export const VERSIONS = versions.versions as Version[];
/** 攻略ページの中身 (正本は data/guide.json) */
export const GUIDE = guide as Guide;
/** 武器と防具の比較 (正本は data/gear.json) */
export const GEAR = gear as Gear;
/** リンク集 (正本は data/links.json) */
export const LINKS = links as Links;
/** 感度変換の係数 (正本は data/sensitivity.json) */
export const SENS = sensitivity as SensData;
/** いまの (最新の) 版 */
export const LATEST_VERSION = latestVersion(VERSIONS);

/** いまの版より古い版の情報か */
export function isOldVersion(v: string): boolean {
  return isOlder(v, VERSIONS);
}

export function findArticle(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}

/** お知らせの区分 (ワイプ・メンテ・サーバー)。紙面では【】の括弧の文字で示す */
export function flagLabel(a: Article): string | null {
  if (a.flags.wipe) return 'ワイプ';
  if (a.flags.maintenance) return 'メンテ';
  if (a.flags.server) return 'サーバー';
  return null;
}

export { TAGS } from './tags';
