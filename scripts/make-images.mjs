#!/usr/bin/env node
// ファビコンの PNG (apple-touch-icon 180px) と共有用の画像 (og.png 1200×630) を描く (npm run images)。
// 公式のロゴやアートワークは使わない。書体は同梱の Fontsource のファイルを読む (外部から読まない)。
// 描いた画像は public/ にコミットする (ビルドのたびには描かない)。
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssUrl = (p) => pathToFileURL(path.join(ROOT, 'node_modules', p)).href;
const svg = readFileSync(path.join(ROOT, 'public/favicon.svg'), 'utf8');

// Fontsource の CSS は書体のファイルを相対で指すので、file:// で開いた HTML から読ませる
const FONTS = `<link rel="stylesheet" href="${cssUrl('@fontsource/dela-gothic-one/400.css')}">
<link rel="stylesheet" href="${cssUrl('@fontsource-variable/noto-sans-jp/index.css')}">`;

const OG = `<!doctype html><html lang="ja"><head><meta charset="utf-8">${FONTS}<style>
body { margin: 0; width: 1200px; height: 630px; background: #171b26; color: #eef0f5; font-family: 'Noto Sans JP Variable', sans-serif;
  display: flex; flex-direction: column; justify-content: center; padding: 0 96px; box-sizing: border-box; gap: 28px; }
.top { display: flex; align-items: center; gap: 28px; }
.top svg { width: 120px; height: 120px; }
h1 { margin: 0; font-family: 'Dela Gothic One', sans-serif; font-weight: 400; font-size: 76px; line-height: 1.15; }
p { margin: 0; font-size: 36px; color: #a3a9b8; font-weight: 500; }
.k { color: #f2b33d; font-weight: 700; font-size: 32px; }
</style></head><body>
<div class="k">【非公式】ROB RUN のアップデートを日本語で</div>
<div class="top">${svg}<h1>ROB RUN<br>日本語アップデート</h1></div>
<p>公式のお知らせの日本語の要約・日本時間・対象の版</p>
</body></html>`;

const browser = await chromium.launch();
try {
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const html = path.join(mkdtempSync(path.join(tmpdir(), 'robrun-og-')), 'og.html');
  writeFileSync(html, OG);
  await og.goto(pathToFileURL(html).href, { waitUntil: 'load' });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: path.join(ROOT, 'public/og.png') });
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.setContent(`<html><body style="margin:0;background:#171b26">${svg.replace('<svg ', '<svg width="180" height="180" ').replace('rx="14"', 'rx="0"')}</body></html>`);
  await icon.screenshot({ path: path.join(ROOT, 'public/apple-touch-icon.png') });
  console.log('images: public/og.png (1200×630) と public/apple-touch-icon.png (180×180) を描きました');
} finally {
  await browser.close();
}
