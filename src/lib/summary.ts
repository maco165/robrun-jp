// 要約の出力の形と、記事 (data/news.json の 1 件) への組み立て (PJ-030 の R-4)。
// 要約の形は Zod で決め、Claude の構造化出力 (output_config.format) にそのまま渡す。
import { z } from 'zod';
import { CHANGE_TYPES, LIMITS, TAGS } from './tags.ts';
import type { InboxItem } from './steamNews.ts';
import { newVersionId, versionAt, type Version } from './versions.ts';

// 文字列の空と上限は check-news と同じ。検査で落ちる出力を、要約の段で受け取らない
export const SummarySchema = z.object({
  headline: z.string().min(1).max(LIMITS.headline),
  impact: z.string().max(LIMITS.impact),
  points: z.array(
    z.object({
      type: z.enum(CHANGE_TYPES),
      target: z.string().min(1).max(LIMITS.target),
      text: z.string().min(1).max(LIMITS.text),
      field: z.string().optional(),
      before: z.string().optional(),
      after: z.string().optional(),
    }),
  ).max(LIMITS.points),
  tags: z.array(z.enum(TAGS)),
  flags: z.object({ wipe: z.boolean(), server: z.boolean(), maintenance: z.boolean() }),
});
export type Summary = z.infer<typeof SummarySchema>;

/** パッチノートか (題が Patch Notes か、Steam のタグに patchnotes)。パッチノートは新しい版を作る */
export function isPatchNote(item: Pick<InboxItem, 'title' | 'tags'>): boolean {
  return /patch\s*notes?/i.test(item.title) || item.tags.includes('patchnotes');
}

/** 公式の記事を組み立てる。パッチノートで、いまの最新より新しければ版を 1 つ作って返す */
export function buildArticle(item: InboxItem, s: Summary, versions: Version[]) {
  let newVersion: Version | null = null;
  const latest = versions.length ? Math.max(...versions.map((v) => new Date(v.releasedAt).getTime())) : -Infinity;
  if (isPatchNote(item) && new Date(item.publishedAt).getTime() > latest) {
    newVersion = {
      id: newVersionId(item.publishedAt, versions),
      kind: 'patch',
      releasedAt: toJst(item.publishedAt),
      title: item.title,
      sourceId: item.gid,
      sourceUrl: item.url,
    };
  }
  const all = newVersion ? [...versions, newVersion] : versions;
  const changeTypes = [...new Set(s.points.map((p) => p.type))];
  const article = {
    id: item.gid,
    source: 'official' as const,
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt,
    gameVersion: versionAt(item.publishedAt, all),
    summaryJa: { headline: s.headline, impact: s.impact, points: s.points },
    tags: s.tags.length ? [...new Set(s.tags)] : ['その他'],
    changeTypes: changeTypes.length ? changeTypes : ['change' as const],
    flags: s.flags,
    summarizedBy: 'ai' as const,
    reviewed: false,
  };
  return { article, newVersion };
}

/** ISO の日時を +09:00 の形にする (versions.json は日本時間で書く) */
export function toJst(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return t.toISOString().replace(/\.\d{3}Z$/, '+09:00');
}

/** BBCode と画像を落として、要約に渡す本文を短くする */
export function plainText(bbcode: string): string {
  return bbcode
    .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '')
    .replace(/\[\*\]/g, '\n- ')
    .replace(/\[\/?(p|list|b|i|u|h\d|url[^\]]*|quote|table|tr|td|th|olist|strike|spoiler|hr)\]/gi, '\n')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
