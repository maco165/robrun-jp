import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseResponse, pickNew } from '../src/lib/steamNews.ts';

const FIXTURE = 'tests/fixtures/steam-news.json';
const items = parseResponse(JSON.parse(readFileSync(FIXTURE, 'utf8')));

test('公式のお知らせだけを、既知のものを除いて古い順に抜き出す', () => {
  const fresh = pickNew(items, new Set(), 4262460);
  assert.deepEqual(fresh.map((a) => a.gid), ['1849458702693254', '1849827110432538']);
  assert.equal(fresh[1].url, 'https://store.steampowered.com/news/app/4262460/view/1849827110432538');
  assert.equal(fresh[1].publishedAt, '2026-11-20T14:59:56.000Z');
  assert.deepEqual(pickNew(items, new Set(['1849458702693254']), 4262460).map((a) => a.gid), ['1849827110432538']);
});

test('応答の形が違えば投げる', () => {
  assert.throws(() => parseResponse({ appnews: {} }), /newsitems/);
  assert.throws(() => parseResponse({ appnews: { newsitems: [{ gid: 1 }] } }), /形が違います/);
});

function run(args: string[]) {
  return spawnSync('npx', ['tsx', 'scripts/fetch-news.ts', ...args], { encoding: 'utf8' });
}

test('CLI: 1 回目は新しい記事を足し、2 回目は 0 件で inbox が変わらない', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'robrun-fetch-'));
  const news = path.join(dir, 'news.json');
  const inbox = path.join(dir, 'inbox.json');
  writeFileSync(news, '[]');
  const first = run(['--fixture', FIXTURE, '--news', news, '--inbox', inbox]);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /新しい記事 2 件/);
  const before = readFileSync(inbox, 'utf8');
  const second = run(['--fixture', FIXTURE, '--news', news, '--inbox', inbox]);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /新しい記事 0 件/);
  assert.equal(readFileSync(inbox, 'utf8'), before);
});

test('CLI: 要約済み (news.json にある) の記事は足さない', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'robrun-fetch-'));
  const news = path.join(dir, 'news.json');
  writeFileSync(news, JSON.stringify([{ id: '1849827110432538' }]));
  const r = run(['--fixture', FIXTURE, '--news', news, '--inbox', path.join(dir, 'inbox.json')]);
  assert.match(r.stdout, /新しい記事 1 件/);
});

test('CLI: 取得に失敗すると終了コード 1', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'robrun-fetch-'));
  const news = path.join(dir, 'news.json');
  writeFileSync(news, '[]');
  const r = run(['--fixture', 'tests/fixtures/steam-news-broken.json', '--news', news, '--inbox', path.join(dir, 'inbox.json')]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /取得に失敗しました/);
});
