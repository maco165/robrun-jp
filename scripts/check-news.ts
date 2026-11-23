// data/news.json の様式の検査 (npm run check:news。PJ-030 の R-4)。NG があれば行ごとに出して終了コード 1。
//   必須の欄・決めたリストに無いタグ・5 種以外の変更の種類・原文の URL・公開日時のタイムゾーン・
//   要約の主体 (summarizedBy)・人の確認 (reviewed)・id の形
// 版 (gameVersion) の検査は check-data が持つ。
// 使い方: tsx scripts/check-news.ts [<news.json>] (既定は data/news.json)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHANGE_TYPES, LIMITS, TAGS } from '../src/lib/tags.ts';

// 公式の記事の id は Steam の gid (数字)。見本の記事 (tests/fixtures/) だけ fixture- を認める (公開用のビルドには prerender が入れない)
const OFFICIAL_URL = /^https:\/\/store\.steampowered\.com\/news\/app\/4262460\/view\/(\d+|fixture-[A-Za-z0-9-]+)$/;
const ZONED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const tags = new Set<string>(TAGS);
const types = new Set<string>(CHANGE_TYPES);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkNews(news: any[]): string[] {
  const ng: string[] = [];
  for (const a of news) {
    const at = `news の ${a?.id ?? '(id 無し)'}`;
    if (typeof a?.id !== 'string' || !a.id) { ng.push(`${at}: id が無い`); continue; }
    if (a.source !== 'official' && a.source !== 'external') ng.push(`${at}: source は official か external`);
    if (typeof a.title !== 'string' || !a.title) ng.push(`${at}: 原文の題 (title) が無い`);
    if (typeof a.url !== 'string' || !a.url) ng.push(`${at}: 原文の URL (url) が無い`);
    else if (a.source === 'official') {
      const m = OFFICIAL_URL.exec(a.url);
      if (!m || m[1] !== a.id) ng.push(`${at}: 公式の記事の URL は Steam のお知らせ (…/view/<id>) で、id と同じ gid を指す`);
    }
    if (typeof a.publishedAt !== 'string' || !ZONED.test(a.publishedAt)) ng.push(`${at}: publishedAt がタイムゾーン付きの日時でない`);
    const s = a.summaryJa;
    if (!s || typeof s.headline !== 'string' || !s.headline) ng.push(`${at}: 見出し (summaryJa.headline) が無い`);
    else if (s.headline.length > LIMITS.headline) ng.push(`${at}: 見出しが ${LIMITS.headline} 字を超える`);
    if (!s || typeof s.impact !== 'string') ng.push(`${at}: 影響 (summaryJa.impact) が無い (無ければ空の文字列)`);
    else if (s.impact.length > LIMITS.impact) ng.push(`${at}: 影響が ${LIMITS.impact} 字を超える`);
    if (!s || !Array.isArray(s.points)) ng.push(`${at}: 要点 (summaryJa.points) が無い`);
    else {
      // 全文の訳にならないよう、要点の件数と字数に上限を置く
      if (s.points.length > LIMITS.points) ng.push(`${at}: 要点が ${LIMITS.points} 件を超える`);
      for (const p of s.points) {
        if (!types.has(p?.type) || !p?.target || !p?.text) ng.push(`${at}: 要点の 1 件に type (決めた 5 種)・target・text が揃っていない`);
        else if (p.target.length > LIMITS.target || p.text.length > LIMITS.text) ng.push(`${at}: 要点の 1 件が字数の上限 (target ${LIMITS.target}・text ${LIMITS.text}) を超える`);
      }
    }
    if (!Array.isArray(a.tags) || a.tags.length === 0) ng.push(`${at}: タグが無い`);
    else for (const t of a.tags) if (!tags.has(t)) ng.push(`${at}: タグ「${t}」は決めたリストに無い`);
    if (!Array.isArray(a.changeTypes) || a.changeTypes.length === 0) ng.push(`${at}: 変更の種類 (changeTypes) が無い`);
    else for (const t of a.changeTypes) if (!types.has(t)) ng.push(`${at}: 変更の種類「${t}」は決めた 5 種 (${CHANGE_TYPES.join('・')}) に無い`);
    if (!a.flags || ['wipe', 'server', 'maintenance'].some((k) => typeof a.flags[k] !== 'boolean')) ng.push(`${at}: flags (wipe・server・maintenance) が揃っていない`);
    if (a.summarizedBy !== 'ai' && a.summarizedBy !== 'human') ng.push(`${at}: 要約の主体 (summarizedBy) は ai か human`);
    if (typeof a.reviewed !== 'boolean') ng.push(`${at}: 人の確認 (reviewed) は true か false`);
  }
  return ng;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? 'data/news.json';
  const news = JSON.parse(readFileSync(path, 'utf8'));
  const ng = checkNews(news);
  for (const l of ng) console.log(`NG ${l}`);
  if (ng.length) process.exit(1);
  console.log(`check-news: OK (記事 ${news.length} 件、${path})`);
}
