import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAYTEST, isOlder, latestVersion, newVersionId, versionAt, type Version } from '../src/lib/versions.ts';

const VERSIONS: Version[] = JSON.parse(readFileSync(new URL('../data/versions.json', import.meta.url), 'utf8')).versions;

test('公開の時点で最新の版を返す', () => {
  assert.equal(versionAt('2026-11-18T10:00:00+09:00', VERSIONS), '2026-11-17');
  assert.equal(versionAt('2026-11-20T23:59:56+09:00', VERSIONS), '2026-11-20');
  assert.equal(versionAt('2026-11-22T00:00:00Z', VERSIONS), '2026-11-20');
});

test('発売より前は playtest', () => {
  assert.equal(versionAt('2026-11-02T01:03:12+09:00', VERSIONS), PLAYTEST);
  assert.equal(versionAt('2026-11-05T02:03:59+09:00', VERSIONS), PLAYTEST);
});

test('いまの版より古い版を見分ける', () => {
  assert.equal(latestVersion(VERSIONS), '2026-11-20');
  assert.equal(isOlder('2026-11-20', VERSIONS), false);
  assert.equal(isOlder('2026-11-17', VERSIONS), true);
  assert.equal(isOlder(PLAYTEST, VERSIONS), true);
  assert.equal(isOlder('2099-01-01', VERSIONS), false);
});

test('一覧の並びが崩れていても日時で決める', () => {
  const shuffled = [VERSIONS[2], VERSIONS[0], VERSIONS[1]];
  assert.equal(latestVersion(shuffled), '2026-11-20');
  assert.equal(versionAt('2026-11-18T00:00:00+09:00', shuffled), '2026-11-17');
});

test('新しい版の id は日本時間の日付。同じ日なら -2', () => {
  assert.equal(newVersionId('2026-11-24T16:00:00Z', VERSIONS), '2026-11-25');
  assert.equal(newVersionId('2026-11-20T15:30:00Z', VERSIONS), '2026-11-21');
  assert.equal(newVersionId('2026-11-20T03:00:00Z', VERSIONS), '2026-11-20-2');
});
