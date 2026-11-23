// 攻略ページ (guide/) の形と検査。正本は data/guide.json。
// 項目ごとに出所の種類 (kind) を持つ: official は公式のお知らせ・公式ヘルプが出典、site は攻略サイトの情報 (数字は公式に無く、サイトにより異なる)
export type GuideRef =
  /** 公式の Steam のお知らせ。gid は記事の id と同じ。記事があればサイト内の要約にも飛ばす */
  | { news: string; title: string }
  /** 公式ヘルプ (Kefir のヘルプセンター) */
  | { help: string; title: string }
  /** 攻略サイト */
  | { site: string; title: string };

export type GuideItem = { text: string; kind: 'official' | 'site'; refs: GuideRef[] };
export type GuideSection = { id: string; title: string; items: GuideItem[] };
export type Guide = {
  /** 内容を確かめた日 (日本時間) */
  updatedAt: string;
  /** どの版の時点の情報か (data/versions.json の id か playtest) */
  basedOn: string;
  sections: GuideSection[];
};

/** 1 項目の上限。原文の訳にならず、1〜2 文で言い切る長さ */
export const GUIDE_TEXT_MAX = 140;
const GID = /^\d{15,20}$/;
const HELP = 'https://kefirgames.helpshift.com/hc/';
const SECTION_ID = /^[a-z][a-z0-9-]*$/;

export function checkGuide(g: Guide, versionIds: Set<string>): string[] {
  const ng: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.updatedAt ?? '')) ng.push('guide: updatedAt は YYYY-MM-DD');
  if (!versionIds.has(g.basedOn)) ng.push(`guide: basedOn ${g.basedOn} が versions.json に無い`);
  const ids = new Set<string>();
  for (const s of g.sections ?? []) {
    const at = `guide の ${s.id}`;
    if (!SECTION_ID.test(s.id ?? '') || ids.has(s.id)) ng.push(`${at}: 節の id が無いか重複か形が違う (小文字の kebab-case)`);
    ids.add(s.id);
    if (!s.title) ng.push(`${at}: 題が無い`);
    if (!s.items?.length) ng.push(`${at}: 項目が無い`);
    (s.items ?? []).forEach((it, i) => {
      const iat = `${at} の ${i + 1} 番目`;
      if (!it.text || it.text.length > GUIDE_TEXT_MAX) ng.push(`${iat}: 本文が無いか ${GUIDE_TEXT_MAX} 字を超える`);
      if (!it.refs?.length) ng.push(`${iat}: 出典が無い`);
      const official = (it.refs ?? []).filter((r) => 'news' in r || 'help' in r).length;
      const site = (it.refs ?? []).filter((r) => 'site' in r).length;
      if (it.kind === 'official' && (official === 0 || site > 0)) ng.push(`${iat}: 公式の項目 (official) の出典は公式のお知らせか公式ヘルプだけ`);
      if (it.kind === 'site' && site === 0) ng.push(`${iat}: 攻略サイトの項目 (site) に攻略サイトの出典が無い`);
      if (it.kind !== 'official' && it.kind !== 'site') ng.push(`${iat}: kind は official か site`);
      for (const r of it.refs ?? []) {
        if (!r.title) ng.push(`${iat}: 出典の題が無い`);
        if ('news' in r && !GID.test(r.news)) ng.push(`${iat}: お知らせの gid ${r.news} の形が違う`);
        if ('help' in r && !r.help.startsWith(HELP)) ng.push(`${iat}: 公式ヘルプの URL が ${HELP} で始まらない`);
        if ('site' in r && !/^https:\/\//.test(r.site)) ng.push(`${iat}: 攻略サイトの URL が https でない`);
      }
    });
  }
  return ng;
}

export type GuideLink = { href: string; label: string; external: boolean };

/**
 * 出典 1 件から張るリンク。公式のお知らせは、サイト内に日本語の要約の記事があればその記事 (題は記事の見出し) と
 * Steam の原文の両方、無ければ原文だけ。公式ヘルプ・攻略サイトはそのページだけ
 */
export function refLinks(
  r: GuideRef,
  find: (id: string) => { id: string; headline: string } | undefined,
  articlePath: (id: string) => string,
  steamUrl: (gid: string) => string,
): GuideLink[] {
  if ('news' in r) {
    const a = find(r.news);
    const steam = { href: steamUrl(r.news), external: true };
    return a
      ? [{ href: articlePath(a.id), label: a.headline, external: false }, { ...steam, label: '原文（Steam・英語）' }]
      : [{ ...steam, label: `${r.title}（Steam・英語）` }];
  }
  if ('help' in r) return [{ href: r.help, label: `${r.title}（公式ヘルプ・英語）`, external: true }];
  return [{ href: r.site, label: r.title, external: true }];
}
