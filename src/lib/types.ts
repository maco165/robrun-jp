/** data/news.json の 1 件。様式の検査は B-005 の scripts/check-news.mjs が持つ */
export type ChangeType = 'buff' | 'nerf' | 'new' | 'fix' | 'change';

export type ChangePoint = {
  type: ChangeType;
  /** 対象 (アイテム名などはゲーム画面に合わせて英語のまま) */
  target: string;
  text: string;
  field?: string;
  before?: string;
  after?: string;
};

export type Article = {
  /** official は Steam の gid、external は ext-<サイト>-<日付>-<slug> */
  id: string;
  source: 'official' | 'external';
  title: string;
  /** 原文の URL */
  url: string;
  /** UTC の ISO 8601 */
  publishedAt: string;
  gameVersion: string;
  /** 公開の時点の版と違う版を付けた理由 (公式の記事が次の版に向けた変更を告げるとき) */
  versionNote?: string;
  summaryJa: { headline: string; impact: string; points: ChangePoint[] };
  tags: string[];
  changeTypes: ChangeType[];
  flags: { wipe: boolean; server: boolean; maintenance: boolean };
  summarizedBy: 'ai' | 'human';
  reviewed: boolean;
};

export type Schedule = {
  updatedAt: string;
  source: string;
  wipeCycleDays: number;
  regions: ({ id: string; name: string } & ({ dailyOpenUtc: string } | { dailyOpenLocal: string; timezone: string }))[];
  notes: string;
};
