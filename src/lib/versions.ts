// 版の決め方 (PJ-030 の R-14)。ROB RUN の公式はパッチに版の番号を付けないので、
// 公式のお知らせ (発売・パッチノート) が出た日 (日本時間) を版の名前にする。発売より前は playtest。
// このファイルは他のファイルを読まない (node --test で型を落として直接読むため)。

export const PLAYTEST = 'playtest';

export type Version = {
  /** YYYY-MM-DD (日本時間)。同じ日に 2 つ目が出たら YYYY-MM-DD-2 */
  id: string;
  kind: 'launch' | 'patch';
  /** ISO 8601 (+09:00) */
  releasedAt: string;
  title: string;
  /** 元のお知らせの Steam の gid */
  sourceId: string;
  sourceUrl: string;
};

const time = (iso: string) => new Date(iso).getTime();

/** 古い順に並べた写し */
export function sortVersions(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => time(a.releasedAt) - time(b.releasedAt));
}

/** いまの (最新の) 版。一覧が空なら playtest */
export function latestVersion(versions: Version[]): string {
  const s = sortVersions(versions);
  return s.length ? s[s.length - 1].id : PLAYTEST;
}

/** その時点で最新の版。最初の版より前なら playtest */
export function versionAt(at: string, versions: Version[]): string {
  let v = PLAYTEST;
  for (const x of sortVersions(versions)) {
    if (time(x.releasedAt) <= time(at)) v = x.id;
  }
  return v;
}

/** 版 v がいまの版より古いか (一覧に無い版は古い扱いにしない。検査は check-data が持つ) */
export function isOlder(v: string, versions: Version[]): boolean {
  const latest = latestVersion(versions);
  if (v === latest) return false;
  if (v === PLAYTEST) return versions.length > 0;
  const s = sortVersions(versions);
  const i = s.findIndex((x) => x.id === v);
  return i >= 0 && i < s.length - 1;
}

/** 新しい版の id。同じ日の版があれば -2, -3 と続ける */
export function newVersionId(releasedAt: string, versions: Version[]): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(releasedAt));
  const ids = new Set(versions.map((v) => v.id));
  if (!ids.has(day)) return day;
  let n = 2;
  while (ids.has(`${day}-${n}`)) n++;
  return `${day}-${n}`;
}

/** 画面に出す版の名前 */
export function versionLabel(v: string): string {
  return v === PLAYTEST ? 'プレイテスト' : `${v} 版`;
}
