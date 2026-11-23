#!/usr/bin/env node
// ブラウザでの通しの検査 (npm run e2e)。見本の記事 (tests/fixtures/news.json) で dist-e2e に組み、vite preview で配り、Playwright の Chromium で開く。
// 1280px と 390px の幅のそれぞれで、トップ・記事一覧・記事・404 について次を確かめる:
//   1. JS を動かす前の HTML (事前描画) に、そのページの見出しの文字列がある
//   2. 横にはみ出さない (document.documentElement.scrollWidth が幅以下)
//   3. ページのエラーと、描画の食い違い (hydration) の警告が無い
//   4. 記事の画面に「AI による要約」(人が要約した記事は「人による要約」) と原文のリンクがある
//   5. <道>/index.html でも描いたあとの見出しが同じページのもの。題・説明に $& や $$ があっても書き込みが壊れない
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const OUT = 'dist-e2e';
const PORT = 4400 + Math.floor(Math.random() * 400);
const BASE = `http://localhost:${PORT}/robrun-jp/`;
const env = { ...process.env, ROBRUN_NEWS: 'tests/fixtures/news.json', ROBRUN_OUT: OUT };

const built = spawnSync('npm', ['run', 'build'], { env, stdio: ['ignore', 'ignore', 'inherit'] });
if (built.status !== 0) {
  console.error('e2e: 見本のデータでの build に失敗しました');
  process.exit(1);
}

const PAGES = [
  { path: '', heading: '【見本】グランドホテルの戦利品を調整' },
  { path: 'news/', heading: '記事一覧' },
  { path: 'articles/fixture-p032/', heading: '【見本】グランドホテルの戦利品を調整', article: true, version: '2026-11-20 版', old: false },
  { path: 'articles/fixture-raid/', heading: '【見本】今週の Federal Raid の時刻を告知', article: true, version: '2026-11-17 版', old: true },
  // GitHub Pages は <道>/index.html にも同じ HTML を返す。描いたあとに 404 に変わらないこと
  { path: 'news/index.html', heading: '記事一覧' },
  { path: 'articles/fixture-p032/index.html', heading: '【見本】グランドホテルの戦利品を調整', article: true },
  // 題と説明に $& と $$ がある見本。HTML への書き込みが $ の並びで壊れないこと
  // 人が要約した記事 (summarizedBy: human) なので「人による要約」と出る
  { path: 'articles/fixture-dollar/', heading: '【見本】報酬 $$500 と $& の表示', article: true, summary: '人による要約', description: '報酬が $$500 増える' },
  // GitHub Pages は知らない道に 404.html の中身を返す。vite preview は返さないので 404.html を直接開く (どちらの道も 404 の画面になる)
  { path: '404.html', heading: 'ページが見つかりません' },
];
const WIDTHS = [1280, 390];

const server = spawn('npx', ['vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'], { env, stdio: 'ignore' });
const fails = [];
try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* まだ立ち上がっていない */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch();
  for (const p of PAGES) {
    const raw = await (await fetch(BASE + p.path)).text();
    // HTML では & が &amp; に逃がされる
    if (!raw.includes(p.heading.replace(/&/g, '&amp;'))) fails.push(`${p.path || '/'}: 事前描画の HTML に見出し「${p.heading}」が無い`);
    if (p.description && !/<meta name="description" content="[^"]*/.exec(raw)?.[0].includes(p.description)) fails.push(`${p.path}: meta description に「${p.description}」が無い`);
    for (const w of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error' || /hydrat/i.test(m.text())) errors.push(m.text()); });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
      // 描いたあと (hydrate のあと) の見出しが、事前描画と同じページのものであること
      const h1 = (await page.textContent('h1')) ?? '';
      if (!h1.includes(p.heading)) fails.push(`${p.path || '/'} @${w}: 描いたあとの見出しが「${h1.slice(0, 40)}」`);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) fails.push(`${p.path || '/'} @${w}: 横にはみ出す (scrollWidth ${sw})`);
      if (errors.length) fails.push(`${p.path || '/'} @${w}: ページのエラー ${errors.join(' / ').slice(0, 300)}`);
      if (p.article) {
        const text = await page.textContent('main');
        const summary = p.summary ?? 'AI による要約';
        if (!text?.includes(summary)) fails.push(`${p.path} @${w}: 「${summary}」が無い`);
        // 版 (R-14): 対象の版が出て、いまの版より古い記事にだけ【古い版の情報】が出る
        if (p.version && !text?.includes(p.version)) fails.push(`${p.path} @${w}: 版「${p.version}」が無い`);
        if (p.old !== undefined && (text?.includes('古い版の情報') ?? false) !== p.old) fails.push(`${p.path} @${w}: 【古い版の情報】が${p.old ? '無い' : '出ている'}`);
        const src = await page.locator('a[href^="https://store.steampowered.com/"]').count();
        if (src === 0) fails.push(`${p.path} @${w}: 原文のリンクが無い`);
      }
      await page.close();
    }
  }
  await browser.close();
} finally {
  server.kill();
}

if (fails.length) {
  for (const f of fails) console.log(`NG ${f}`);
  process.exit(1);
}
console.log(`e2e: OK (${PAGES.length} ページ × ${WIDTHS.length} 幅)`);
