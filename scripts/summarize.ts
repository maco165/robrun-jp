// .cache/inbox.json の公式の記事を Claude Haiku で日本語に要約し、data/news.json に足す (npm run summarize。PJ-030 の R-4)。
//   新しいパッチノートなら data/versions.json に版を 1 行足す。要約できた記事は inbox から外す
//   断られた (refusal)・形が合わない記事は inbox に残し、NG 行を出して最後に終了コード 1 (要約できた分は書く)
//   ANTHROPIC_API_KEY (か ANTHROPIC_AUTH_TOKEN) が無ければ、何もせずに理由を出して終了コード 1
// 使い方: tsx scripts/summarize.ts [--inbox <inbox.json>] [--news <news.json>] [--versions <versions.json>] [--skipped <skipped.json>] [--mock <見本の要約の JSON>]
//   --mock: API を呼ばず、見本の要約 (gid → 要約) を使う (単体テストと workflow の見本の回のため)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { SummarySchema, buildArticle, plainText, type Summary } from '../src/lib/summary.ts';
import type { InboxItem } from '../src/lib/steamNews.ts';
import type { Version } from '../src/lib/versions.ts';
import { clearFailure, isGivenUp, recordFailure, type Skipped } from '../src/lib/skipped.ts';
import { MAX_PER_RUN } from '../src/lib/tags.ts';
import { checkNews } from './check-news.ts';

const MODEL = 'claude-haiku-5-5';
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const inboxPath = arg('--inbox', '.cache/inbox.json');
const newsPath = arg('--news', 'data/news.json');
const versionsPath = arg('--versions', 'data/versions.json');
const mockPath = process.argv.includes('--mock') ? arg('--mock', '') : null;
// 断られた記事の gid を覚える場所。次の回から取らない (毎時、同じ記事で料金をかけ続けないため)
const skippedPath = arg('--skipped', 'data/skipped.json');

class Refused extends Error {}

async function summarizeWithClaude(client: Anthropic, system: string, item: InboxItem): Promise<Summary> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system,
    output_config: { effort: 'medium', format: zodOutputFormat(SummarySchema) },
    messages: [{ role: 'user', content: `題: ${item.title}\n公開: ${item.publishedAt}\n\n本文:\n${plainText(item.contents)}` }],
  });
  // Haiku には断られたときの自動の代わりのモデルが無い。断られた記事は要約しない
  if (response.stop_reason === 'refusal') throw new Refused(`断られました (${response.stop_details?.category ?? '理由の分類なし'})`);
  if (response.stop_reason === 'max_tokens') throw new Error('出力が上限で切れました');
  if (!response.parsed_output) throw new Error('出力が決めた形に合いませんでした');
  return response.parsed_output;
}

async function main() {
  const inbox: InboxItem[] = existsSync(inboxPath) ? JSON.parse(readFileSync(inboxPath, 'utf8')) : [];
  if (inbox.length === 0) {
    console.log('要約する記事 0 件');
    return 0;
  }
  let get: (item: InboxItem) => Promise<Summary>;
  if (mockPath) {
    const mock = JSON.parse(readFileSync(mockPath, 'utf8')) as Record<string, unknown>;
    get = async (item) => {
      if (!(item.gid in mock)) throw new Error('見本の要約がありません');
      const m = mock[item.gid] as { refusal?: string };
      // 見本で「断られた」を再現する
      if (m.refusal) throw new Refused(`断られました (${m.refusal})`);
      return SummarySchema.parse(m);
    };
  } else {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      console.error('summarize: ANTHROPIC_API_KEY がありません (GitHub Actions では Secrets に登録する)。要約しません');
      return 1;
    }
    // 1 件あたり最大 60 秒・再試行 1 回 (最悪 2 分 × MAX_PER_RUN 件で、要約の段の時間切れ 12 分に収まる)
    const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
    const system = readFileSync('prompts/summarize.md', 'utf8');
    get = (item) => summarizeWithClaude(client, system, item);
  }

  const news = JSON.parse(readFileSync(newsPath, 'utf8')) as { id: string }[];
  const versionsFile = JSON.parse(readFileSync(versionsPath, 'utf8')) as { note: string; versions: Version[] };
  let skipped: Skipped[] = existsSync(skippedPath) ? JSON.parse(readFileSync(skippedPath, 'utf8')) : [];
  const left: InboxItem[] = [];
  let ok = 0;
  let failed = 0;
  // 1 件ごとに 4 つのファイルを書き出す。途中で止まっても (時間切れ)、要約できた分と失敗の回数は残る
  const save = (rest: InboxItem[]) => {
    writeFileSync(newsPath, JSON.stringify(news, null, 2) + '\n');
    writeFileSync(versionsPath, JSON.stringify(versionsFile, null, 2) + '\n');
    writeFileSync(inboxPath, JSON.stringify([...left, ...rest], null, 2) + '\n');
    writeFileSync(skippedPath, JSON.stringify(skipped, null, 2) + '\n');
  };
  // 古い順に要約する (新しい版が順に増える)
  const queue = [...inbox].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  let tried = 0;
  let deferred = 0;
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (news.some((a) => a.id === item.gid)) continue;
    // 1 回の件数の上限を超えた分は、要約せずに inbox に残す (次の回に回す)
    if (tried >= MAX_PER_RUN) {
      left.push(item);
      deferred++;
      continue;
    }
    tried++;
    const given = skipped.find((s) => s.gid === item.gid);
    if (given && isGivenUp(given)) continue;
    try {
      const s = await get(item);
      const { article, newVersion } = buildArticle(item, s, versionsFile.versions);
      // 検査で落ちる記事はコミットに進めない (落ちると毎時の更新がそこで止まるため)。失敗として数える
      const ng = checkNews([article]);
      if (ng.length) throw new Error(`検査に通りません: ${ng.join(' / ')}`);
      news.push(article);
      skipped = clearFailure(skipped, item.gid);
      if (newVersion) versionsFile.versions.push(newVersion);
      ok++;
      console.log(`  ${item.gid} ${article.gameVersion} ${s.headline}${newVersion ? ` (新しい版 ${newVersion.id})` : ''}`);
    } catch (e) {
      // 断られた記事は 1 回で、それ以外 (形が合わない・検査に通らない・通信) は MAX_ATTEMPTS 回で、取らなくなる
      const refused = e instanceof Refused;
      skipped = recordFailure(skipped, item.gid, (e as Error).message, refused, new Date().toISOString());
      if (!refused) left.push(item);
      failed++;
      console.log(`NG ${item.gid} ${item.title}: ${(e as Error).message}`);
    }
    save(queue.slice(i + 1));
  }
  save([]);
  console.log(`要約した記事 ${ok} 件、失敗 ${failed} 件、次の回に回す ${deferred} 件 (記録: ${skippedPath})`);
  return failed ? 1 : 0;
}

process.exit(await main());
