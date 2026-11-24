import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeOf } from '../src/lib/route.ts';

test('道の判定: index.html・末尾の / の有無・知らない道', () => {
  for (const p of ['', 'index.html', '/']) assert.equal(routeOf(p).kind, 'top');
  for (const p of ['links', 'links/', 'links/index.html']) assert.equal(routeOf(p).kind, 'links');
  for (const p of ['tools/sensitivity/', 'tools/sensitivity/index.html']) assert.equal(routeOf(p).kind, 'sens');
  assert.deepEqual(routeOf('guide/gear/index.html'), { kind: 'genre', id: 'gear' });
  assert.deepEqual(routeOf('articles/fixture-p032/'), { kind: 'article', id: 'fixture-p032' });
  for (const p of ['404.html', 'x/', 'guide/a/b/', 'tools/']) assert.equal(routeOf(p).kind, 'none');
});
