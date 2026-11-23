// 攻略のジャンルごとのイメージ画像を描く (npm run images:guide)。公式のロゴ・アートワーク・スクリーンショットは使わない。
//   public/img/og-guide-<id>.png (1200×630、SNS と検索の共有用。ジャンルの題と一行を入れる)
//   public/img/guide-<id>.png    (1600×400、ページの見出しの下の帯。文字は番号だけ)
//   public/img/og-guide.png       (攻略の入口の共有用)
// 書体は同梱の Fontsource、アイコンは lucide (src/components/guideIcons.ts と同じ)。描いた画像は public/ にコミットする
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { guideIcon } from '../src/components/guideIcons.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/img');
const cssUrl = (p: string) => pathToFileURL(path.join(ROOT, 'node_modules', p)).href;
const guide = JSON.parse(readFileSync(path.join(ROOT, 'data/guide.json'), 'utf8')) as { sections: { id: string; title: string; summary: string }[] };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const icon = (id: string, size: number, stroke = 1.25) => renderToStaticMarkup(createElement(guideIcon(id), { size, strokeWidth: stroke, color: '#f2b33d' }));

const HEAD = `<meta charset="utf-8">
<link rel="stylesheet" href="${cssUrl('@fontsource/dela-gothic-one/400.css')}">
<link rel="stylesheet" href="${cssUrl('@fontsource-variable/noto-sans-jp/index.css')}">
<style>
body { margin: 0; background: #171b26; color: #eef0f5; font-family: 'Noto Sans JP Variable', sans-serif; overflow: hidden; }
.stripes { position: absolute; inset: 0; background: repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,0.025) 22px 44px); }
.rule { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #f2b33d; }
.disp { font-family: 'Dela Gothic One', sans-serif; font-weight: 400; }
</style>`;

const og = (kicker: string, title: string, sub: string, id: string) => `<!doctype html><html lang="ja"><head>${HEAD}<style>
body { width: 1200px; height: 630px; position: relative; }
.wrap { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 80px; gap: 48px; box-sizing: border-box; }
.text { flex: 1; display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.k { color: #f2b33d; font-weight: 700; font-size: 30px; }
h1 { margin: 0; font-size: ${title.length > 9 ? 68 : 84}px; line-height: 1.15; }
p { margin: 0; font-size: 32px; color: #a3a9b8; font-weight: 500; line-height: 1.5; }
.site { font-size: 24px; color: #6d7487; }
.ic { width: 330px; height: 330px; border: 2px solid #4e576a; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
</style></head><body><div class="stripes"></div><div class="wrap"><div class="text">
<div class="k">${esc(kicker)}</div><h1 class="disp">${esc(title)}</h1><p>${esc(sub)}</p><div class="site">ROB RUN 日本語アップデート（非公式）</div>
</div><div class="ic">${icon(id, 200)}</div></div><div class="rule"></div></body></html>`;

const banner = (n: string, id: string) => `<!doctype html><html lang="ja"><head>${HEAD}<style>
body { width: 1600px; height: 400px; position: relative; }
.num { position: absolute; left: 64px; top: 50%; transform: translateY(-50%); font-size: 300px; line-height: 1; color: transparent; -webkit-text-stroke: 3px #f2b33d; letter-spacing: -8px; }
.row { position: absolute; right: 64px; top: 0; bottom: 0; display: flex; align-items: center; gap: 36px; }
.row > span { opacity: var(--o); }
.big { width: 280px; height: 280px; border: 2px solid #4e576a; border-radius: 50%; display: grid; place-items: center; }
</style></head><body><div class="stripes"></div><div class="num disp">${esc(n)}</div>
<div class="row"><span style="--o:.25">${icon(id, 90, 1.5)}</span><span style="--o:.5">${icon(id, 140, 1.25)}</span><span class="big">${icon(id, 180, 1.1)}</span></div>
<div class="rule"></div></body></html>`;

mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), 'robrun-guide-img-'));
const browser = await chromium.launch();
try {
  const shot = async (html: string, w: number, h: number, file: string) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const f = path.join(tmp, `${path.basename(file)}.html`);
    writeFileSync(f, html);
    await page.goto(pathToFileURL(f).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, file) });
    await page.close();
  };
  await shot(og('【非公式】ROB RUN 攻略', 'いまわかっている ROB RUN の仕組み', 'ジャンル別に図と表で。出典と対象の版つき', 'map'), 1200, 630, 'og-guide.png');
  for (const [i, s] of guide.sections.entries()) {
    const n = String(i + 1).padStart(2, '0');
    await shot(og(`【ROB RUN 攻略 ${n}】`, s.title, s.summary, s.id), 1200, 630, `og-guide-${s.id}.png`);
    await shot(banner(n, s.id), 1600, 400, `guide-${s.id}.png`);
  }
  console.log(`images:guide: ${guide.sections.length} ジャンル × 2 枚と入口の 1 枚を public/img/ に描きました`);
} finally {
  await browser.close();
}
