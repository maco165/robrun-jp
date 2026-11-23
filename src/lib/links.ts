// リンク集 (links/) の形と検査。正本は data/links.json
export type LinkEntry = { name: string; url: string; lang: string; about: string; updated?: string; feed?: string; note?: string };
export type LinkGroup = { id: string; title: string; items: LinkEntry[] };
export type Links = { checkedAt: string; note: string; groups: LinkGroup[] };

/** 載せないサイト (ゲーム内通貨・アイテムの販売、代行、チートの販売)。公式の規約が禁じる取引や不正につながる */
export const BLOCKED_HOSTS = ['u4n.com', 'u4gm.com', 'ezg.com', 'aoeah.com', 'iggm.com', 'boostroom.com', 'timesaver.gg', 'neonsect.com', 'surchcheats.com', 'skycoach.gg', 'lfcarry.com', 'xboosty.com'];

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function isBlocked(u: string): boolean {
  const h = host(u);
  return BLOCKED_HOSTS.some((b) => h === b || h.endsWith(`.${b}`));
}

export function checkLinks(l: Links): string[] {
  const ng: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.checkedAt ?? '')) ng.push('links: checkedAt は YYYY-MM-DD');
  const urls = new Set<string>();
  for (const g of l.groups ?? []) {
    if (!g.id || !g.title || !g.items?.length) ng.push(`links の ${g.id ?? '?'}: id・題・項目のどれかが無い`);
    for (const e of g.items ?? []) {
      const at = `links の ${g.id} の ${e.name ?? '(名前なし)'}`;
      if (!e.name || !e.lang || !e.about) ng.push(`${at}: 名前・言語・説明のどれかが無い`);
      if (e.about && e.about.length > 80) ng.push(`${at}: 説明が 80 字を超える`);
      for (const u of [e.url, e.feed].filter(Boolean) as string[]) {
        if (!/^https:\/\//.test(u) || !host(u)) ng.push(`${at}: URL が https でない (${u})`);
        if (isBlocked(u)) ng.push(`${at}: 載せないサイト (販売・代行・チート) の URL (${u})`);
      }
      if (!e.url) ng.push(`${at}: URL が無い`);
      if (urls.has(e.url)) ng.push(`${at}: URL が重複`);
      urls.add(e.url);
      if (e.updated && !/^\d{4}-\d{2}-\d{2}$/.test(e.updated)) ng.push(`${at}: updated は YYYY-MM-DD`);
    }
  }
  return ng;
}
