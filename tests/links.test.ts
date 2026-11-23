import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkLinks, isBlocked, type Links } from '../src/lib/links.ts';

const LINKS: Links = JSON.parse(readFileSync(new URL('../data/links.json', import.meta.url), 'utf8'));
const one = (e: Partial<Links['groups'][0]['items'][0]>): Links => ({ checkedAt: '2026-11-24', note: 'n', groups: [{ id: 'g', title: 'G', items: [{ name: 'a', url: 'https://example.com/', lang: '英語', about: 'x', ...e }] }] });

test('本番の data/links.json は NG が無い', () => {
  assert.deepEqual(checkLinks(LINKS), []);
});

test('販売・代行・チートのサイトは本体もサブドメインも載せない', () => {
  assert.equal(isBlocked('https://timesaver.gg/blog/x'), true);
  assert.equal(isBlocked('https://www.u4gm.com/rob-run'), true);
  assert.equal(isBlocked('https://shop.boostroom.com/'), true);
  assert.equal(isBlocked('https://games.gg/rob-run/'), false);
  assert.match(checkLinks(one({ url: 'https://timesaver.gg/' })).join(), /載せないサイト/);
  assert.match(checkLinks(one({ feed: 'https://iggm.com/feed' })).join(), /載せないサイト/);
});

test('http・説明の長さ・日付の形・重複を検査する', () => {
  assert.match(checkLinks(one({ url: 'http://example.com/' })).join(), /https でない/);
  assert.match(checkLinks(one({ about: 'あ'.repeat(81) })).join(), /80 字/);
  assert.match(checkLinks(one({ updated: '11/24' })).join(), /YYYY-MM-DD/);
  const dup = one({});
  dup.groups[0].items.push({ ...dup.groups[0].items[0] });
  assert.match(checkLinks(dup).join(), /重複/);
});
