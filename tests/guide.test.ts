import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkGuide, refLinks, GUIDE_TEXT_MAX, type Guide } from '../src/lib/guide.ts';

const VERSION_IDS = new Set(['playtest', ...JSON.parse(readFileSync(new URL('../data/versions.json', import.meta.url), 'utf8')).versions.map((v: { id: string }) => v.id)]);
const GUIDE: Guide = JSON.parse(readFileSync(new URL('../data/guide.json', import.meta.url), 'utf8'));
const NEWS = { news: '1848557880479055', title: 'First Changes & Server Schedule' };
const HELP = { help: 'https://kefirgames.helpshift.com/hc/en/14-rob-run/faq/1349-how-do-i-sell-my-loot/?l=en', title: 'How do I sell my loot?' };
const SITE = { site: 'https://example.com/guide', title: '攻略サイト' };
const one = (item: Guide['sections'][0]['items'][0]): Guide => ({ updatedAt: '2026-11-24', basedOn: '2026-11-20', sections: [{ id: 'sell', title: '換金', items: [item] }] });

test('本番の data/guide.json は NG が無い', () => {
  assert.deepEqual(checkGuide(GUIDE, VERSION_IDS), []);
});

test('公式の項目に攻略サイトの出典が混ざれば NG、攻略サイトの項目に攻略サイトの出典が無ければ NG', () => {
  assert.deepEqual(checkGuide(one({ text: 'a', kind: 'official', refs: [NEWS, HELP] }), VERSION_IDS), []);
  assert.match(checkGuide(one({ text: 'a', kind: 'official', refs: [NEWS, SITE] }), VERSION_IDS).join(), /公式の項目/);
  assert.match(checkGuide(one({ text: 'a', kind: 'site', refs: [NEWS] }), VERSION_IDS).join(), /攻略サイトの出典が無い/);
});

test('出典の無い項目・長すぎる本文・知らない版・形の違う gid は NG', () => {
  assert.match(checkGuide(one({ text: 'a', kind: 'official', refs: [] }), VERSION_IDS).join(), /出典が無い/);
  assert.match(checkGuide(one({ text: 'あ'.repeat(GUIDE_TEXT_MAX + 1), kind: 'official', refs: [NEWS] }), VERSION_IDS).join(), /字を超える/);
  assert.match(checkGuide({ ...one({ text: 'a', kind: 'official', refs: [NEWS] }), basedOn: '0.3.2' }, VERSION_IDS).join(), /0\.3\.2 が versions\.json に無い/);
  assert.match(checkGuide(one({ text: 'a', kind: 'official', refs: [{ ...NEWS, news: 'abc' }] }), VERSION_IDS).join(), /gid abc/);
});

test('公式のお知らせは、記事があればサイト内の要約と原文の両方、無ければ原文だけに飛ぶ', () => {
  const path = (id: string) => `/robrun-jp/articles/${id}/`;
  const steam = (gid: string) => `https://store.steampowered.com/news/app/4262460/view/${gid}`;
  const found = refLinks(NEWS, (id) => ({ id, headline: '最初の変更点' }), path, steam);
  assert.deepEqual(found.map((l) => [l.href, l.external]), [[path(NEWS.news), false], [steam(NEWS.news), true]]);
  assert.equal(found[0].label, '最初の変更点');
  const missing = refLinks(NEWS, () => undefined, path, steam);
  assert.deepEqual(missing.map((l) => l.href), [steam(NEWS.news)]);
  assert.match(missing[0].label, /First Changes/);
});
