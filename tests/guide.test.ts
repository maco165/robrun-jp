import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkGuide, refLinks, sourceList, GUIDE_CELL_MAX, GUIDE_TEXT_MAX, type Guide, type GuidePart } from '../src/lib/guide.ts';

const VERSION_IDS = new Set(['playtest', ...JSON.parse(readFileSync(new URL('../data/versions.json', import.meta.url), 'utf8')).versions.map((v: { id: string }) => v.id)]);
const GUIDE: Guide = JSON.parse(readFileSync(new URL('../data/guide.json', import.meta.url), 'utf8'));
const NEWS = { news: '1848557880479055', title: 'First Changes & Server Schedule' };
const HELP = { help: 'https://kefirgames.helpshift.com/hc/en/14-rob-run/faq/1349-how-do-i-sell-my-loot/?l=en', title: 'How do I sell my loot?' };
const SITE = { site: 'https://example.com/guide', title: '攻略サイト' };
const one = (item: GuidePart['items'][0]): Guide => ({ updatedAt: '2026-11-24', basedOn: '2026-11-20', sections: [{ id: 'sell', title: '換金', summary: '売り方', parts: [{ id: 'sell-a', title: '売り先', figures: [], items: [item] }] }] });

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

test('節の id の重複・kind の値・公式ヘルプの URL・攻略サイトの https を検査する', () => {
  const base = one({ text: 'a', kind: 'official', refs: [NEWS] });
  assert.match(checkGuide({ ...base, sections: [base.sections[0], base.sections[0]] }, VERSION_IDS).join(), /重複/);
  assert.match(checkGuide(one({ text: 'a', kind: 'other' as 'site', refs: [SITE] }), VERSION_IDS).join(), /kind は official か site/);
  assert.match(checkGuide(one({ text: 'a', kind: 'official', refs: [{ ...HELP, help: 'https://example.com/faq' }] }), VERSION_IDS).join(), /公式ヘルプの URL/);
  assert.match(checkGuide(one({ text: 'a', kind: 'site', refs: [{ ...SITE, site: 'http://example.com' }] }), VERSION_IDS).join(), /https でない/);
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

test('出典は図・本文の順に初めて出た順で番号を振り、同じ出典は 1 つにまとめる', () => {
  const { refs, numberOf } = sourceList({
    figures: [{ type: 'flow', title: '流れ', kind: 'official', refs: [HELP, NEWS], steps: [] }],
    items: [{ text: 'a', kind: 'official', refs: [NEWS] }, { text: 'b', kind: 'site', refs: [SITE, HELP] }],
  });
  assert.deepEqual(refs, [HELP, NEWS, SITE]);
  assert.deepEqual([HELP, NEWS, SITE].map(numberOf), [1, 2, 3]);
  assert.equal(numberOf({ ...NEWS, title: '題が違っても同じお知らせ' }), 2);
});

test('図の検査: 種類ごとの中身・文字の長さ・出典のきまり', () => {
  const withFig = (f: unknown): Guide => { const b = one({ text: 'a', kind: 'official', refs: [NEWS] }); b.sections[0].parts[0].figures = [f as GuidePart['figures'][0]]; return b; };
  const flow = { type: 'flow', title: '流れ', kind: 'official', refs: [NEWS], steps: [{ title: 'a', note: 'b' }, { title: 'c', note: 'd' }] };
  assert.deepEqual(checkGuide(withFig(flow), VERSION_IDS), []);
  assert.match(checkGuide(withFig({ ...flow, steps: [{ title: 'a', note: 'b' }] }), VERSION_IDS).join(), /2 つ未満/);
  assert.match(checkGuide(withFig({ ...flow, steps: [{ title: 'あ'.repeat(GUIDE_CELL_MAX + 1), note: 'b' }, { title: 'c', note: 'd' }] }), VERSION_IDS).join(), /字を超える/);
  assert.match(checkGuide(withFig({ ...flow, refs: [SITE] }), VERSION_IDS).join(), /公式の項目/);
  assert.match(checkGuide(withFig({ type: 'table', title: '表', kind: 'official', refs: [NEWS], columns: ['a', 'b'], rows: [['x']] }), VERSION_IDS).join(), /列の数/);
  assert.match(checkGuide(withFig({ type: 'bars', title: '棒', kind: 'site', refs: [SITE], unit: '%', bars: [{ label: 'a', value: -1 }] }), VERSION_IDS).join(), /0 以上/);
  assert.match(checkGuide(withFig({ type: 'chart', title: '?', kind: 'official', refs: [NEWS] }), VERSION_IDS).join(), /図の種類 chart/);
});

test('図の形の崩れは例外ではなく NG にする (figures の欠け・表の列・split の中身・tone・見出し・棒の名前と単位)', () => {
  const base = one({ text: 'a', kind: 'official', refs: [NEWS] });
  const sec = base.sections[0];
  const withFig = (f: unknown): Guide => { const b = one({ text: 'a', kind: 'official', refs: [NEWS] }); b.sections[0].parts[0].figures = [f as GuidePart['figures'][0]]; return b; };
  const noFigures = { ...base, sections: [{ ...sec, parts: [{ ...sec.parts[0], figures: undefined as unknown as [] }] }] };
  assert.match(checkGuide(noFigures, VERSION_IDS).join(), /figures/);
  const table = { type: 'table', title: '表', kind: 'official', refs: [NEWS], columns: ['a'], rows: [['x']] };
  assert.match(checkGuide(withFig({ ...table, columns: undefined }), VERSION_IDS).join(), /列か行が無い/);
  assert.match(checkGuide(withFig({ ...table, columns: [''] }), VERSION_IDS).join(), /空か/);
  assert.match(checkGuide(withFig({ ...table, rows: [] }), VERSION_IDS).join(), /列か行が無い/);
  const split = { type: 'split', title: '比べる', kind: 'official', refs: [NEWS], columns: [{ title: '消える', tone: 'lose', items: ['a'] }, { title: '残る', tone: 'keep', items: ['b'] }] };
  assert.deepEqual(checkGuide(withFig(split), VERSION_IDS), []);
  assert.match(checkGuide(withFig({ ...split, columns: [split.columns[0], { title: '残る', tone: 'keep' }] }), VERSION_IDS).join(), /中身が無い/);
  assert.match(checkGuide(withFig({ ...split, columns: [split.columns[0], { ...split.columns[1], tone: 'good' }] }), VERSION_IDS).join(), /lose か keep/);
  assert.match(checkGuide(withFig({ ...split, columns: [split.columns[0]] }), VERSION_IDS).join(), /2 つ未満/);
  const bars = { type: 'bars', title: '棒', kind: 'site', refs: [SITE], unit: '%', bars: [{ label: 'a', value: 1 }] };
  assert.deepEqual(checkGuide(withFig(bars), VERSION_IDS), []);
  assert.match(checkGuide(withFig({ ...bars, unit: undefined }), VERSION_IDS).join(), /単位/);
  assert.match(checkGuide(withFig({ ...bars, bars: [{ label: 'a', value: 1 }, { label: 'a', value: 2 }] }), VERSION_IDS).join(), /重複/);
  assert.match(checkGuide(withFig({ ...bars, bars: [] }), VERSION_IDS).join(), /棒が無い/);
  assert.match(checkGuide(withFig({ type: 'pyramid', title: 'ピ', kind: 'official', refs: [NEWS], tiers: [{ title: 'a', note: 'b' }] }), VERSION_IDS).join(), /2 つ未満/);
  assert.match(checkGuide(withFig({ type: 'flow', title: '', kind: 'official', refs: [NEWS], steps: [{ title: 'a', note: 'b' }, { title: 'c', note: 'd' }] }), VERSION_IDS).join(), /題が無い/);
  assert.match(checkGuide({ ...base, sections: [{ ...sec, summary: '' }] }, VERSION_IDS).join(), /summary/);
  assert.match(checkGuide({ ...base, sections: [{ ...sec, summary: 'あ'.repeat(51) }] }, VERSION_IDS).join(), /summary/);
});

test('転送: 行き先の見出しが無い・今のページと同じ id なら NG', () => {
  const b = one({ text: 'a', kind: 'official', refs: [NEWS] });
  assert.deepEqual(checkGuide({ ...b, moved: { old: 'sell/#sell-a' } }, VERSION_IDS), []);
  assert.match(checkGuide({ ...b, moved: { old: 'sell/#none' } }, VERSION_IDS).join(), /行き先/);
  assert.match(checkGuide({ ...b, moved: { sell: 'sell/#sell-a' } }, VERSION_IDS).join(), /同じ id/);
});
