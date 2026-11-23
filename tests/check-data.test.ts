import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkData } from '../scripts/check-data.ts';
import type { Version } from '../src/lib/versions.ts';

const VERSIONS: Version[] = JSON.parse(readFileSync(new URL('../data/versions.json', import.meta.url), 'utf8')).versions;
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/news.json', import.meta.url), 'utf8'));
const ok = { id: 'a1', source: 'official', publishedAt: '2026-11-21T09:00:00Z', gameVersion: '2026-11-20' };

test('本番のデータと見本は NG が無い', () => {
  assert.deepEqual(checkData(JSON.parse(readFileSync(new URL('../data/news.json', import.meta.url), 'utf8')), VERSIONS), []);
  assert.deepEqual(checkData(FIXTURE, VERSIONS), []);
});

test('版の無い記事は NG (id を含む)', () => {
  const ng = checkData([{ ...ok, gameVersion: undefined }], VERSIONS);
  assert.equal(ng.length, 1);
  assert.match(ng[0], /a1.*版 \(gameVersion\) が無い/);
});

test('一覧に無い版を指す記事は NG', () => {
  assert.match(checkData([{ ...ok, gameVersion: '0.3.2' }], VERSIONS).join(), /a1.*0\.3\.2 が versions\.json に無い/);
});

test('公式の記事の版が公開の時点の版と違えば NG。他サイトの記事はよい', () => {
  assert.match(checkData([{ ...ok, gameVersion: '2026-11-17' }], VERSIONS).join(), /公開の時点の版 2026-11-20 と違う/);
  assert.deepEqual(checkData([{ ...ok, source: 'external', gameVersion: '2026-11-17' }], VERSIONS), []);
});

test('次の版に向けた公式の記事は、理由 (versionNote) があれば直後の版を付けてよい', () => {
  const pre = { id: 'a2', source: 'official', publishedAt: '2026-11-04T22:04:49+09:00', gameVersion: '2026-11-05' };
  assert.match(checkData([pre], VERSIONS).join(), /公開の時点の版 playtest と違う/);
  assert.deepEqual(checkData([{ ...pre, versionNote: '発売の版の変更点の告知' }], VERSIONS), []);
  assert.match(checkData([{ ...pre, gameVersion: '2026-11-17', versionNote: '飛ばし' }], VERSIONS).join(), /と違う/);
});

test('版の id が日時と合わなければ NG (日付の違い・タイムゾーン無し・1 つ目の無い -2)', () => {
  assert.match(checkData([], [VERSIONS[0], VERSIONS[1], { ...VERSIONS[2], id: '2026-11-21' }]).join(), /2026-11-21: id が日時から決まる版の名前 2026-11-20 と違う/);
  assert.match(checkData([], [VERSIONS[0], VERSIONS[1], { ...VERSIONS[2], releasedAt: '2026-11-20T23:59:56' }]).join(), /タイムゾーン付きの日時でない/);
  assert.match(checkData([], [VERSIONS[0], VERSIONS[1], { ...VERSIONS[2], id: '2026-11-20-2' }]).join(), /版の名前 2026-11-20 と違う/);
  const second = { ...VERSIONS[2], id: '2026-11-20-2', releasedAt: '2026-11-20T23:59:58+09:00', sourceId: '1', sourceUrl: 'https://store.steampowered.com/news/app/4262460/view/1' };
  assert.deepEqual(checkData([], [...VERSIONS, second]), []);
});

test('記事の id の重複は NG', () => {
  assert.match(checkData([ok, ok], VERSIONS).join(), /a1: id が重複/);
});

test('版の一覧の崩れ (並び・重複・URL) は NG', () => {
  assert.match(checkData([], [VERSIONS[1], VERSIONS[0]]).join(), /古い順に並んでいない/);
  assert.match(checkData([], [VERSIONS[0], VERSIONS[0]]).join(), /id が重複/);
  assert.match(checkData([], [{ ...VERSIONS[0], sourceUrl: 'https://example.com/' }]).join(), /sourceUrl/);
  assert.match(checkData([], [{ ...VERSIONS[0], id: 'v1.0' }]).join(), /YYYY-MM-DD/);
});
