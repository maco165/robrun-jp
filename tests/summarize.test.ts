import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SummarySchema, buildArticle, isPatchNote, plainText, toJst, type Summary } from '../src/lib/summary.ts';
import type { InboxItem } from '../src/lib/steamNews.ts';
import type { Version } from '../src/lib/versions.ts';
import { checkNews } from '../scripts/check-news.ts';
import { checkData } from '../scripts/check-data.ts';

const VERSIONS: Version[] = JSON.parse(readFileSync('data/versions.json', 'utf8')).versions;
const MOCK: Record<string, Summary> = JSON.parse(readFileSync('tests/fixtures/summary-mock.json', 'utf8'));
const item = (gid: string, title: string, publishedAt: string, tags: string[] = []): InboxItem => ({
  gid, title, url: `https://store.steampowered.com/news/app/4262460/view/${gid}`, publishedAt, author: '', tags, contents: '',
});
const NEW_PATCH = item('1850000000000001', 'Patch Notes', '2026-11-25T10:00:00.000Z');

test('パッチノートの見分け (題か Steam のタグ)', () => {
  assert.equal(isPatchNote({ title: 'Patch Notes', tags: [] }), true);
  assert.equal(isPatchNote({ title: 'Hotfix', tags: ['patchnotes'] }), true);
  assert.equal(isPatchNote({ title: 'ROB RUN: Global Map', tags: [] }), false);
});

test('新しいパッチノートは版を 1 つ作り、その版の記事になる', () => {
  const { article, newVersion } = buildArticle(NEW_PATCH, MOCK['1850000000000001'], VERSIONS);
  assert.equal(newVersion?.id, '2026-11-25');
  assert.equal(newVersion?.releasedAt, '2026-11-25T19:00:00+09:00');
  assert.equal(newVersion?.sourceUrl, NEW_PATCH.url);
  assert.equal(article.gameVersion, '2026-11-25');
  assert.deepEqual(article.changeTypes, ['buff']);
  assert.equal(article.summarizedBy, 'ai');
  assert.equal(article.reviewed, false);
});

test('一覧にあるパッチノート・パッチノートでない記事・発売前の記事は版を作らない', () => {
  const known = buildArticle(item('1849827110432538', 'Patch Notes', '2026-11-20T14:59:56.000Z'), MOCK['1849827110432538'], VERSIONS);
  assert.equal(known.newVersion, null);
  assert.equal(known.article.gameVersion, '2026-11-20');
  const notice = buildArticle(item('1', 'ROB RUN: Global Map', '2026-11-26T00:00:00.000Z'), MOCK['1849827110432538'], VERSIONS);
  assert.equal(notice.newVersion, null);
  assert.equal(notice.article.gameVersion, '2026-11-20');
  const pre = buildArticle(item('2', 'Playtest News', '2026-11-01T16:03:12.000Z'), MOCK['1849827110432538'], VERSIONS);
  assert.equal(pre.article.gameVersion, 'playtest');
});

test('組み立てた記事は check-news と check-data を通る', () => {
  const { article, newVersion } = buildArticle(NEW_PATCH, MOCK['1850000000000001'], VERSIONS);
  assert.deepEqual(checkNews([article]), []);
  assert.deepEqual(checkData([article], [...VERSIONS, newVersion!]), []);
});

test('本文の BBCode と画像を落とす', () => {
  const t = plainText('[p]Hi[/p][list][*][p]A[/p][/*][/list][img src="x"][/img]');
  assert.match(t, /Hi/);
  assert.match(t, /- \s*\n?A/);
  assert.doesNotMatch(t, /\[|img/);
  assert.equal(toJst('2026-11-20T14:59:56.000Z'), '2026-11-20T23:59:56+09:00');
});

test('check-news: 決めたリストに無いタグ・種類、URL・主体・確認の欠けは NG (id を含む)', () => {
  const { article } = buildArticle(NEW_PATCH, MOCK['1850000000000001'], VERSIONS);
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ tags: ['大型アップデート'] }, /タグ「大型アップデート」は決めたリストに無い/],
    [{ changeTypes: ['rework'] }, /変更の種類「rework」は決めた 5 種/],
    [{ url: '' }, /原文の URL/],
    [{ url: 'https://example.com/' }, /Steam のお知らせ/],
    [{ summarizedBy: undefined }, /要約の主体/],
    [{ reviewed: undefined }, /人の確認/],
    [{ publishedAt: '2026-11-25T10:00:00' }, /タイムゾーン/],
  ];
  for (const [patch, re] of cases) {
    const ng = checkNews([{ ...article, ...patch }]);
    assert.match(ng.join('\n'), re);
    assert.match(ng.join('\n'), /1850000000000001/);
  }
});

function setup(items: InboxItem[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'robrun-sum-'));
  const p = { inbox: path.join(dir, 'inbox.json'), news: path.join(dir, 'news.json'), versions: path.join(dir, 'versions.json'), skipped: path.join(dir, 'skipped.json'), dir };
  writeFileSync(p.inbox, JSON.stringify(items));
  writeFileSync(p.news, '[]');
  copyFileSync('data/versions.json', p.versions);
  return p;
}
// 本物の claude を呼ばないよう、既定で偽の CLI (tests/fixtures/fake-claude.mjs) を指す
const FAKE_ENV = { ...process.env, CLAUDE_BIN: path.resolve('tests/fixtures/fake-claude.mjs') };
const run = (p: ReturnType<typeof setup>, extra: string[], env: NodeJS.ProcessEnv = FAKE_ENV) =>
  spawnSync('npx', ['tsx', 'scripts/summarize.ts', '--inbox', p.inbox, '--news', p.news, '--versions', p.versions, '--skipped', p.skipped, ...extra], { encoding: 'utf8', env });

test('CLI (見本の要約): 記事を足し、新しいパッチノートで版を足し、inbox を空にする', () => {
  const p = setup([NEW_PATCH, item('1849827110432538', 'Patch Notes', '2026-11-20T14:59:56.000Z')]);
  const r = run(p, ['--mock', 'tests/fixtures/summary-mock.json']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /要約した記事 2 件、失敗 0 件、次の回に回す 0 件/);
  const news = JSON.parse(readFileSync(p.news, 'utf8'));
  assert.deepEqual(news.map((a: { id: string }) => a.id), ['1849827110432538', '1850000000000001']);
  const versions = JSON.parse(readFileSync(p.versions, 'utf8')).versions;
  assert.equal(versions.length, VERSIONS.length + 1);
  assert.deepEqual(JSON.parse(readFileSync(p.inbox, 'utf8')), []);
  assert.deepEqual(checkNews(news), []);
  assert.deepEqual(checkData(news, versions), []);
});

test('CLI: 要約できない記事は inbox に残り、終了コード 1 (要約できた分は書く)', () => {
  const p = setup([NEW_PATCH, item('9', 'Unknown', '2026-11-26T00:00:00.000Z')]);
  const r = run(p, ['--mock', 'tests/fixtures/summary-mock.json']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /NG 9 Unknown/);
  assert.equal(JSON.parse(readFileSync(p.news, 'utf8')).length, 1);
  assert.deepEqual(JSON.parse(readFileSync(p.inbox, 'utf8')).map((a: InboxItem) => a.gid), ['9']);
});

test('CLI: 断られた記事は skipped に覚え、次の取得で取らない', () => {
  const p = setup([item('1849458702693254', 'Patch Notes', '2026-11-17T11:19:45.000Z')]);
  const mock = path.join(p.dir, 'mock.json');
  writeFileSync(mock, JSON.stringify({ '1849458702693254': { refusal: 'cyber' } }));
  const r = run(p, ['--mock', mock]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /断られました \(cyber\)/);
  const sk = JSON.parse(readFileSync(p.skipped, 'utf8'));
  assert.deepEqual(sk.map((a: { gid: string; status: string }) => [a.gid, a.status]), [['1849458702693254', 'refused']]);
  assert.deepEqual(JSON.parse(readFileSync(p.inbox, 'utf8')), []);
  // 次の回の取得は、覚えた記事を取らない (見本の応答の公式の 2 件のうち 1 件だけ)
  const inbox2 = path.join(p.dir, 'inbox2.json');
  const f = spawnSync('npx', ['tsx', 'scripts/fetch-news.ts', '--fixture', 'tests/fixtures/steam-news.json', '--news', p.news, '--inbox', inbox2, '--skipped', p.skipped], { encoding: 'utf8' });
  assert.match(f.stdout, /新しい記事 1 件/);
  assert.doesNotMatch(f.stdout, /1849458702693254/);
});

test('CLI: 検査に落ちる要約 (空の target) は記事に入れず失敗に数え、3 回で取得の段が取らなくなる', () => {
  const gid = '1849458702693254';
  const p = setup([item(gid, 'Patch Notes', '2026-11-17T11:19:45.000Z')]);
  const mock = path.join(p.dir, 'mock.json');
  writeFileSync(mock, JSON.stringify({ [gid]: { ...MOCK[gid], points: [{ type: 'fix', target: '', text: 'x' }] } }));
  for (let i = 1; i <= 3; i++) {
    writeFileSync(p.inbox, JSON.stringify([item(gid, 'Patch Notes', '2026-11-17T11:19:45.000Z')]));
    const r = run(p, ['--mock', mock]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /要約した記事 0 件、失敗 1 件/);
    assert.deepEqual(JSON.parse(readFileSync(p.news, 'utf8')), []);
    assert.equal(JSON.parse(readFileSync(p.skipped, 'utf8'))[0].attempts, i);
  }
  // 3 回失敗したので、次の回の取得はこの記事を取らない
  const f = spawnSync('npx', ['tsx', 'scripts/fetch-news.ts', '--fixture', 'tests/fixtures/steam-news.json', '--news', p.news, '--inbox', path.join(p.dir, 'inbox3.json'), '--skipped', p.skipped], { encoding: 'utf8' });
  assert.match(f.stdout, /新しい記事 1 件/);
  assert.doesNotMatch(f.stdout, new RegExp(gid));
});

test('要約の形は、要点 13 件・長すぎる見出し・空の見出しを受け取らない (全文の訳を防ぐ上限)', () => {
  const base = MOCK['1850000000000001'];
  const p = { type: 'fix' as const, target: 'X', text: 'y' };
  assert.equal(SummarySchema.safeParse({ ...base, points: Array(13).fill(p) }).success, false);
  assert.equal(SummarySchema.safeParse({ ...base, points: Array(12).fill(p) }).success, true);
  assert.equal(SummarySchema.safeParse({ ...base, headline: 'あ'.repeat(81) }).success, false);
  assert.equal(SummarySchema.safeParse({ ...base, headline: '' }).success, false);
  const { article } = buildArticle(NEW_PATCH, base, VERSIONS);
  assert.match(checkNews([{ ...article, summaryJa: { ...article.summaryJa, points: Array(13).fill(p) } }]).join(), /12 件を超える/);
});

test('CLI: 1 回は 5 件まで。残りは inbox に残して次の回に回す', () => {
  const items = Array.from({ length: 7 }, (_, i) => item(`18500000000000${10 + i}`, 'ROB RUN: Notice', `2026-11-2${i}T00:00:00.000Z`));
  const p = setup(items);
  const mock = path.join(p.dir, 'mock.json');
  writeFileSync(mock, JSON.stringify(Object.fromEntries(items.map((x) => [x.gid, MOCK['1849827110432538']]))));
  const r = run(p, ['--mock', mock]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /要約した記事 5 件、失敗 0 件、次の回に回す 2 件/);
  assert.equal(JSON.parse(readFileSync(p.news, 'utf8')).length, 5);
  assert.deepEqual(JSON.parse(readFileSync(p.inbox, 'utf8')).map((x: InboxItem) => x.gid), [items[5].gid, items[6].gid]);
});

test('CLI: API キーが無ければ何もせずに終了コード 1', () => {
  const p = setup([NEW_PATCH]);
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  const r = run(p, ['--engine', 'api'], env);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ANTHROPIC_API_KEY がありません/);
  assert.equal(readFileSync(p.news, 'utf8'), '[]');
});

test('CLI の道: 偽の claude の structured_output を記事にする', () => {
  const p = setup([NEW_PATCH]);
  const r = run(p, [], { ...FAKE_ENV, FAKE_CLAUDE: 'ok' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const news = JSON.parse(readFileSync(p.news, 'utf8'));
  assert.equal(news.length, 1);
  assert.equal(news[0].summaryJa.headline, '偽の要約');
  assert.equal(JSON.parse(readFileSync(p.versions, 'utf8')).versions.length, VERSIONS.length + 1);
});

test('CLI の道: 断られた・形が合わない・JSON でない出力は失敗に数える', () => {
  for (const [mode, status, re] of [['refusal', 'refused', /断られました/], ['badshape', 'failing', /形に合いませんでした/], ['garbage', 'failing', /JSON でない/]] as const) {
    const p = setup([NEW_PATCH]);
    const r = run(p, [], { ...FAKE_ENV, FAKE_CLAUDE: mode });
    assert.equal(r.status, 1, mode);
    assert.match(r.stdout, re);
    assert.deepEqual(JSON.parse(readFileSync(p.news, 'utf8')), []);
    assert.equal(JSON.parse(readFileSync(p.skipped, 'utf8'))[0].status, status);
  }
});

test('CLI の道: claude の CLI が無ければ、何もせずに終了コード 1 (失敗の回数を増やさない)', () => {
  const p = setup([NEW_PATCH]);
  const r = run(p, [], { ...process.env, CLAUDE_BIN: '/nonexistent/claude' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /claude の CLI がありません/);
  assert.equal(existsSync(p.skipped), false);
});

test('CLI の道: 渡す引数は、ツールなし・設定と MCP を読まない・出力の形つき', () => {
  const p = setup([NEW_PATCH]);
  const argsFile = path.join(p.dir, 'args.json');
  run(p, [], { ...FAKE_ENV, FAKE_CLAUDE: 'ok', FAKE_CLAUDE_ARGS: argsFile });
  const args: string[] = JSON.parse(readFileSync(argsFile, 'utf8'));
  for (const a of ['-p', '--restricted', '--strict-mcp-config', '--no-session-persistence']) assert.ok(args.includes(a), a);
  assert.equal(args[args.indexOf('--tools') + 1], '');
  assert.equal(args[args.indexOf('--model') + 1], 'claude-haiku-5-5');
  const schema = JSON.parse(args[args.indexOf('--json-schema') + 1]);
  assert.equal(schema.properties.points.maxItems, 12);
  // claude の CLI は "$schema" (draft 2020-12) を読めずに止まるので、渡さない
  assert.equal('$schema' in schema, false);
});
