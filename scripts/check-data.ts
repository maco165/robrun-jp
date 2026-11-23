// data/ の検査 (npm run check:data)。NG があれば行ごとに出して終了コード 1。
//   版の一覧 (data/versions.json): id の形・重複・元のお知らせの重複・日時の並び・元の URL
//   攻略 (data/guide.json): 節の id・項目の出典と出所の種類 (公式か攻略サイトか)・本文の長さ・基にした版 (src/lib/guide.ts)
//   記事 (data/news.json): id の重複・版 (gameVersion) の有無・一覧に無い版・公式の記事の版が公開の時点の版と合うか
// 使い方: tsx scripts/check-data.ts [--news <記事の JSON>] (既定は data/news.json)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkGuide, type Guide } from '../src/lib/guide.ts';
import { PLAYTEST, newVersionId, sortVersions, versionAt, type Version } from '../src/lib/versions.ts';

type NewsItem = { id?: string; source?: string; publishedAt?: string; gameVersion?: string; versionNote?: string };

const ID = /^\d{4}-\d{2}-\d{2}(-\d+)?$/;
/** 日時はタイムゾーン (Z か ±hh:mm) 付き。無いと読む機械の時間帯で日付と並びがずれる */
const ZONED = /(Z|[+-]\d{2}:\d{2})$/;
const APP_NEWS = 'https://store.steampowered.com/news/app/4262460/view/';

export function checkData(news: NewsItem[], versions: Version[]): string[] {
  const ng: string[] = [];
  const ids = new Set<string>();
  const sources = new Set<string>();
  let prev = -Infinity;
  for (const v of versions) {
    const at = `versions.json の ${v.id ?? '(id 無し)'}`;
    if (!v.id || !ID.test(v.id)) ng.push(`${at}: id は YYYY-MM-DD か YYYY-MM-DD-n`);
    if (ids.has(v.id)) ng.push(`${at}: id が重複`);
    ids.add(v.id);
    if (!v.sourceId || sources.has(v.sourceId)) ng.push(`${at}: 元のお知らせ (sourceId) が無いか重複`);
    sources.add(v.sourceId);
    if (v.sourceUrl !== APP_NEWS + v.sourceId) ng.push(`${at}: sourceUrl が元のお知らせの URL (${APP_NEWS}<sourceId>) と違う`);
    if (v.kind !== 'launch' && v.kind !== 'patch') ng.push(`${at}: kind は launch か patch`);
    const t = new Date(v.releasedAt).getTime();
    if (Number.isNaN(t) || !ZONED.test(v.releasedAt ?? '')) ng.push(`${at}: releasedAt がタイムゾーン付きの日時でない`);
    else {
      if (t < prev) ng.push(`${at}: 一覧が古い順に並んでいない`);
      // 版の名前は日付 (JST)。それより前の版から決まる id (同じ日は -2…) と同じであること
      const expected = newVersionId(v.releasedAt, versions.filter((x) => new Date(x.releasedAt).getTime() < t));
      if (v.id && v.id !== expected) ng.push(`${at}: id が日時から決まる版の名前 ${expected} と違う`);
    }
    prev = Number.isNaN(t) ? prev : t;
  }
  const known = new Set([...ids, PLAYTEST]);
  const seen = new Set<string>();
  for (const a of news) {
    const at = `news の ${a.id ?? '(id 無し)'}`;
    if (!a.id) ng.push(`${at}: id が無い`);
    else if (seen.has(a.id)) ng.push(`${at}: id が重複`);
    seen.add(a.id ?? '');
    if (!a.gameVersion) {
      ng.push(`${at}: 版 (gameVersion) が無い`);
      continue;
    }
    if (!known.has(a.gameVersion)) ng.push(`${at}: 版 ${a.gameVersion} が versions.json に無い`);
    // 公式の記事は、公開の時点の版。ただし次の版に向けた変更を告げる記事 (例: 発売の直前の変更点の告知) は、
    // 理由 (versionNote) を書けば直後の版を付けてよい。他サイトの記事は、扱う中身の版を人が決める (公開の時点と違ってよい)
    if (a.source === 'official' && a.publishedAt && known.has(a.gameVersion)) {
      const expected = versionAt(a.publishedAt, versions);
      const order = [PLAYTEST, ...sortVersions(versions).map((v) => v.id)];
      const next = order[order.indexOf(expected) + 1];
      if (a.gameVersion !== expected && !(a.versionNote && a.gameVersion === next)) {
        ng.push(`${at}: 公式の記事の版 ${a.gameVersion} が公開の時点の版 ${expected} と違う (次の版 ${next ?? '(無い)'} に向けた記事なら versionNote に理由を書く)`);
      }
    }
  }
  return ng;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--news');
  const newsPath = i > 0 ? process.argv[i + 1] : 'data/news.json';
  const news = JSON.parse(readFileSync(newsPath, 'utf8')) as NewsItem[];
  const versions = (JSON.parse(readFileSync('data/versions.json', 'utf8')) as { versions: Version[] }).versions;
  const guide = JSON.parse(readFileSync('data/guide.json', 'utf8')) as Guide;
  const ng = [...checkData(news, versions), ...checkGuide(guide, new Set([PLAYTEST, ...versions.map((v) => v.id)]))];
  for (const l of ng) console.log(`NG ${l}`);
  if (ng.length) process.exit(1);
  console.log(`check-data: OK (版 ${versions.length} 件・記事 ${news.length} 件・攻略 ${guide.sections.length} 節、${newsPath})`);
}
