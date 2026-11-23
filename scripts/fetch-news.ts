// 公式ニュースを取得し、まだ要約していない記事だけを .cache/inbox.json に足す (npm run fetch:news)。
//   既知の記事 = data/news.json の id、.cache/inbox.json にもう入っている gid、data/skipped.json で諦めた記事 (断られた・決めた回数失敗した) の gid
//   取得に失敗したら (HTTP のエラー・応答の形の違い) 理由を出して終了コード 1
// 使い方: tsx scripts/fetch-news.ts [--fixture <応答の JSON>] [--news <news.json>] [--inbox <inbox.json>] [--skipped <skipped.json>] [--timeout-ms <ミリ秒>]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseResponse, pickNew, OFFICIAL_FEED, type InboxItem } from '../src/lib/steamNews.ts';
import { isGivenUp, type Skipped } from '../src/lib/skipped.ts';

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const fixture = process.argv.includes('--fixture') ? arg('--fixture', '') : null;
// 時間切れ (ミリ秒)。Steam が応答を返さなくても、毎時の更新が次の回と重ならないように止める
const timeoutMs = Number(arg('--timeout-ms', '30000'));
const newsPath = arg('--news', 'data/news.json');
const inboxPath = arg('--inbox', '.cache/inbox.json');
// 断られて要約しないと決めた記事 (gid だけ)。取らない
const skippedPath = arg('--skipped', 'data/skipped.json');
const steam = JSON.parse(readFileSync('data/steam.json', 'utf8')) as { appid: number };
const OFFICIAL_API = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${steam.appid}&count=20&maxlength=0&feeds=${OFFICIAL_FEED}&format=json`;
// 単体テストが手元のサーバーを指すためだけに使う
const apiUrl = arg('--api-url', OFFICIAL_API);

async function load(): Promise<unknown> {
  if (fixture) return JSON.parse(readFileSync(fixture, 'utf8'));
  let res: Response;
  try {
    res = await fetch(apiUrl, { headers: { 'User-Agent': 'robrun-jp (+https://github.com/maco165/robrun-jp)' }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if ((e as Error).name === 'TimeoutError') throw new Error(`Steam の API が ${timeoutMs / 1000} 秒以内に応答しませんでした (時間切れ)`);
    throw e;
  }
  if (!res.ok) throw new Error(`Steam の API が HTTP ${res.status} を返しました`);
  return res.json();
}

try {
  const items = parseResponse(await load());
  const news = JSON.parse(readFileSync(newsPath, 'utf8')) as { id: string }[];
  const inbox: InboxItem[] = existsSync(inboxPath) ? JSON.parse(readFileSync(inboxPath, 'utf8')) : [];
  const skipped: Skipped[] = existsSync(skippedPath) ? JSON.parse(readFileSync(skippedPath, 'utf8')) : [];
  // 断られた記事と、決めた回数失敗した記事は取らない。それより少ない失敗はまた取って試す
  const known = new Set([...news.map((a) => a.id), ...inbox.map((a) => a.gid), ...skipped.filter(isGivenUp).map((a) => a.gid)]);
  const fresh = pickNew(items, known, steam.appid);
  if (fresh.length) {
    mkdirSync(path.dirname(inboxPath), { recursive: true });
    writeFileSync(inboxPath, JSON.stringify([...inbox, ...fresh], null, 2) + '\n');
  }
  console.log(`新しい記事 ${fresh.length} 件 (取得 ${items.length} 件、${inboxPath})`);
  for (const a of fresh) console.log(`  ${a.gid} ${a.publishedAt} ${a.title}`);
} catch (e) {
  console.error(`fetch-news: 取得に失敗しました: ${(e as Error).message}`);
  process.exit(1);
}
