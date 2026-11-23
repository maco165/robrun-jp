// Steam の GetNewsForApp の応答から、まだ扱っていない公式のお知らせを抜き出す (PJ-030 の R-3)。
// このファイルは他のファイルを読まない (scripts/fetch-news.ts と単体テストが直接読む)。

/** GetNewsForApp/v2 の newsitems の 1 件 (使う欄だけ) */
export type SteamNewsItem = {
  gid: string;
  title: string;
  url: string;
  author?: string;
  contents: string;
  feedname: string;
  /** Unix 秒 */
  date: number;
  tags?: string[];
};

/** 要約の入力 (.cache/inbox.json の 1 件) */
export type InboxItem = {
  gid: string;
  title: string;
  /** 公式のお知らせの URL (Steam のニュースのページ) */
  url: string;
  /** UTC の ISO 8601 */
  publishedAt: string;
  author: string;
  tags: string[];
  /** 英語の本文 (BBCode)。要約にだけ使い、リポジトリに残さない */
  contents: string;
};

export const OFFICIAL_FEED = 'steam_community_announcements';

export function newsUrl(appid: number, gid: string): string {
  return `https://store.steampowered.com/news/app/${appid}/view/${gid}`;
}

/** 応答の形を確かめ、newsitems を返す。形が違えば投げる (取得の失敗として終了コード 1 にする) */
export function parseResponse(json: unknown): SteamNewsItem[] {
  const items = (json as { appnews?: { newsitems?: unknown } })?.appnews?.newsitems;
  if (!Array.isArray(items)) throw new Error('応答に appnews.newsitems がありません');
  for (const n of items) {
    const x = n as Partial<SteamNewsItem>;
    if (typeof x.gid !== 'string' || typeof x.title !== 'string' || typeof x.date !== 'number' || typeof x.contents !== 'string' || typeof x.feedname !== 'string') {
      throw new Error(`newsitems の 1 件の形が違います (gid: ${String(x.gid)})`);
    }
  }
  return items as SteamNewsItem[];
}

/** 公式のお知らせのうち、known (要約済みと取得済み) に無いものを古い順に返す */
export function pickNew(items: SteamNewsItem[], known: Set<string>, appid: number): InboxItem[] {
  return items
    .filter((n) => n.feedname === OFFICIAL_FEED && !known.has(n.gid))
    .sort((a, b) => a.date - b.date)
    .map((n) => ({
      gid: n.gid,
      title: n.title,
      url: newsUrl(appid, n.gid),
      publishedAt: new Date(n.date * 1000).toISOString(),
      author: n.author ?? '',
      tags: n.tags ?? [],
      contents: n.contents,
    }));
}
