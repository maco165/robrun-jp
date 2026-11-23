// 攻略ページ (guide/) の形と検査。正本は data/guide.json。
// 項目ごとに出所の種類 (kind) を持つ: official は公式のお知らせ・公式ヘルプが出典、site は攻略サイトの情報 (数字は公式に無く、サイトにより異なる)
import { isBlocked } from './links';

export type GuideRef =
  /** 公式の Steam のお知らせ。gid は記事の id と同じ。記事があればサイト内の要約にも飛ばす */
  | { news: string; title: string }
  /** 公式ヘルプ (Kefir のヘルプセンター) */
  | { help: string; title: string }
  /** 攻略サイト */
  | { site: string; title: string };

export type GuideItem = { text: string; kind: 'official' | 'site'; refs: GuideRef[] };

/** 図。どれも出所の種類と出典を持つ (本文の項目と同じきまり) */
type FigureBase = { title: string; kind: 'official' | 'site'; refs: GuideRef[]; note?: string };
export type GuideFigure = FigureBase &
  (
    | { type: 'flow'; steps: { title: string; note: string }[] }
    | { type: 'pyramid'; tiers: { title: string; note: string }[] }
    | { type: 'table'; columns: string[]; rows: string[][] }
    | { type: 'bars'; unit: string; /** 値の前に + を付ける (上乗せの割合など) */ plus?: boolean; bars: { label: string; value: number; note?: string }[] }
    /** 自前の模式図の地図。cols × rows の升目に区域を置く。位置は出典の相対位置 (北・中心など) から決め、縮尺は無い */
    | { type: 'map'; cols: number; rows: number; zones: { label: string; note?: string; col: number; row: number; colSpan?: number; rowSpan?: number; tone?: 'center' | 'normal' | 'muted' }[] }
    | { type: 'split'; columns: { title: string; tone: 'lose' | 'keep'; items: string[] }[] }
  );

export type GuideSection = { id: string; title: string; summary: string; figures: GuideFigure[]; items: GuideItem[] };
export type Guide = {
  /** 内容を確かめた日 (日本時間) */
  updatedAt: string;
  /** どの版の時点の情報か (data/versions.json の id か playtest) */
  basedOn: string;
  sections: GuideSection[];
};

/** 1 項目の上限。原文の訳にならず、1〜2 文で言い切る長さ */
export const GUIDE_TEXT_MAX = 140;
/** 入口のカードの一行と、図の中の文字の上限。図は短く言い切る */
export const GUIDE_SUMMARY_MAX = 50;
export const GUIDE_CELL_MAX = 40;
const GID = /^\d{15,20}$/;
const HELP = 'https://kefirgames.helpshift.com/hc/';
const SECTION_ID = /^[a-z][a-z0-9-]*$/;

export function checkGuide(g: Guide, versionIds: Set<string>): string[] {
  const ng: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.updatedAt ?? '')) ng.push('guide: updatedAt は YYYY-MM-DD');
  if (!versionIds.has(g.basedOn)) ng.push(`guide: basedOn ${g.basedOn} が versions.json に無い`);
  const ids = new Set<string>();
  const checkRefs = (at: string, kind: string, refs: GuideRef[] | undefined) => {
    if (!refs?.length) ng.push(`${at}: 出典が無い`);
    const official = (refs ?? []).filter((r) => 'news' in r || 'help' in r).length;
    const site = (refs ?? []).filter((r) => 'site' in r).length;
    if (kind === 'official' && (official === 0 || site > 0)) ng.push(`${at}: 公式の項目 (official) の出典は公式のお知らせか公式ヘルプだけ`);
    if (kind === 'site' && site === 0) ng.push(`${at}: 攻略サイトの項目 (site) に攻略サイトの出典が無い`);
    if (kind !== 'official' && kind !== 'site') ng.push(`${at}: kind は official か site`);
    for (const r of refs ?? []) {
      if (!r.title) ng.push(`${at}: 出典の題が無い`);
      if ('news' in r && !GID.test(r.news)) ng.push(`${at}: お知らせの gid ${r.news} の形が違う`);
      if ('help' in r && !r.help.startsWith(HELP)) ng.push(`${at}: 公式ヘルプの URL が ${HELP} で始まらない`);
      if ('site' in r && !/^https:\/\//.test(r.site)) ng.push(`${at}: 攻略サイトの URL が https でない`);
      if ('site' in r && isBlocked(r.site)) ng.push(`${at}: 載せないサイト (販売・代行・チート) を出典にしている (${r.site})`);
    }
  };
  for (const s of g.sections ?? []) {
    const at = `guide の ${s.id}`;
    if (!SECTION_ID.test(s.id ?? '') || ids.has(s.id)) ng.push(`${at}: 節の id が無いか重複か形が違う (小文字の kebab-case)`);
    ids.add(s.id);
    if (!s.title) ng.push(`${at}: 題が無い`);
    if (!s.items?.length) ng.push(`${at}: 項目が無い`);
    if (!s.summary || s.summary.length > GUIDE_SUMMARY_MAX) ng.push(`${at}: 入口の一行 (summary) が無いか ${GUIDE_SUMMARY_MAX} 字を超える`);
    if (!Array.isArray(s.figures)) ng.push(`${at}: figures (図の一覧) が無い。図が無い節は [] と書く`);
    (s.figures ?? []).forEach((f, i) => {
      const fat = `${at} の図 ${i + 1}`;
      if (!f.title) ng.push(`${fat}: 題が無い`);
      checkRefs(fat, f.kind, f.refs);
      const cells: string[] = [];
      if (f.type === 'flow') {
        if ((f.steps?.length ?? 0) < 2) ng.push(`${fat}: 流れ図の段が 2 つ未満`);
        for (const x of f.steps ?? []) cells.push(x.title, x.note);
      } else if (f.type === 'pyramid') {
        if ((f.tiers?.length ?? 0) < 2) ng.push(`${fat}: ピラミッドの段が 2 つ未満`);
        for (const x of f.tiers ?? []) cells.push(x.title, x.note);
      } else if (f.type === 'table') {
        if (!f.columns?.length || !f.rows?.length) ng.push(`${fat}: 表の列か行が無い`);
        cells.push(...(f.columns ?? []));
        for (const r of f.rows ?? []) {
          if (!Array.isArray(r) || r.length !== (f.columns?.length ?? 0)) ng.push(`${fat}: 行の列の数が見出しと違う`);
          cells.push(...(Array.isArray(r) ? r : []));
        }
      } else if (f.type === 'bars') {
        if (!f.bars?.length) ng.push(`${fat}: 棒が無い`);
        if (typeof f.unit !== 'string') ng.push(`${fat}: 棒の単位 (unit) が無い`);
        const labels = new Set<string>();
        for (const b of f.bars ?? []) {
          if (!Number.isFinite(b.value) || b.value < 0) ng.push(`${fat}: 棒の値 ${b.label} が 0 以上の数でない`);
          if (labels.has(b.label)) ng.push(`${fat}: 棒の名前 ${b.label} が重複`);
          labels.add(b.label);
          cells.push(b.label);
        }
      } else if (f.type === 'split') {
        if ((f.columns?.length ?? 0) < 2) ng.push(`${fat}: 比べる列が 2 つ未満`);
        for (const c of f.columns ?? []) {
          if (c.tone !== 'lose' && c.tone !== 'keep') ng.push(`${fat}: 列「${c.title}」の tone は lose か keep`);
          if (!c.items?.length) ng.push(`${fat}: 列「${c.title}」に中身が無い`);
          cells.push(c.title, ...(c.items ?? []));
        }
      } else if (f.type === 'map') {
        const cols = f.cols, rows = f.rows;
        if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1 || cols > 12 || rows > 12) ng.push(`${fat}: 地図の升目 (cols・rows) は 1〜12 の整数`);
        if (!f.zones?.length) ng.push(`${fat}: 地図に区域が無い`);
        for (const z of f.zones ?? []) {
          const cs = z.colSpan ?? 1, rs = z.rowSpan ?? 1;
          if (!(z.col >= 1 && z.row >= 1 && z.col + cs - 1 <= cols && z.row + rs - 1 <= rows)) ng.push(`${fat}: 区域「${z.label}」が升目の外にはみ出す`);
          cells.push(z.label);
          if (z.note) cells.push(z.note);
        }
      } else ng.push(`${fat}: 図の種類 ${(f as { type: string }).type} を知らない`);
      for (const c of cells) if (!c || c.length > GUIDE_CELL_MAX) ng.push(`${fat}: 図の文字「${(c ?? '').slice(0, 20)}」が空か ${GUIDE_CELL_MAX} 字を超える`);
    });
    (s.items ?? []).forEach((it, i) => {
      const iat = `${at} の ${i + 1} 番目`;
      if (!it.text || it.text.length > GUIDE_TEXT_MAX) ng.push(`${iat}: 本文が無いか ${GUIDE_TEXT_MAX} 字を超える`);
      checkRefs(iat, it.kind, it.refs);
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

/** 出典の重なりを見分ける鍵 */
export function refKey(r: GuideRef): string {
  return 'news' in r ? `news:${r.news}` : 'help' in r ? r.help : r.site;
}

/**
 * ジャンルの出典を 1 か所にまとめるための通し番号。図・本文の順に初めて出た順で 1 から振る。
 * 本文と図には番号だけを付け、リンクはページの末尾の出典の一覧に 1 回だけ置く
 */
export function sourceList(s: Pick<GuideSection, 'figures' | 'items'>): { refs: GuideRef[]; numberOf: (r: GuideRef) => number } {
  const refs: GuideRef[] = [];
  const index = new Map<string, number>();
  for (const r of [...s.figures.flatMap((f) => f.refs), ...s.items.flatMap((it) => it.refs)]) {
    if (!index.has(refKey(r))) {
      refs.push(r);
      index.set(refKey(r), refs.length);
    }
  }
  return { refs, numberOf: (r) => index.get(refKey(r)) ?? 0 };
}
