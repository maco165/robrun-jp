// 記事は @news から読む。@news は既定で data/news.json、e2e では ROBRUN_NEWS の見本 (tests/fixtures/news.json) を指す (vite.config.ts)
import news from '@news';
import schedule from '../../data/schedule.json';
import versions from '../../data/versions.json';
import { isOlder, latestVersion, type Version } from './versions';
import type { Article, Schedule } from './types';

/** 新しい順 */
export const ARTICLES: Article[] = [...(news as Article[])].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
export const SCHEDULE = schedule as Schedule;
export const VERSIONS = versions.versions as Version[];
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

export const TAGS = ['金策', '強盗', '武器', '車両', '拠点', '警察', '刑務所', 'サーバー', 'ワイプ', 'UI', 'バグ修正', 'イベント', 'バトルパス', 'その他'];
