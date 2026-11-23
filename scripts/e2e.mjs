#!/usr/bin/env node
// ブラウザでの通しの検査 (npm run e2e)。見本の記事 (tests/fixtures/news.json) で dist-e2e に組み、vite preview で配り、Playwright の Chromium で開く。
// 1280px と 390px の幅のそれぞれで、トップ・記事一覧・記事・404 について次を確かめる:
//   1. JS を動かす前の HTML (事前描画) に、そのページの見出しの文字列がある
//   2. 横にはみ出さない (document.documentElement.scrollWidth が幅以下)
//   3. ページのエラーと、描画の食い違い (hydration) の警告が無い
//   4. 記事の画面に情報欄の要約に「AI が作成」(人が要約した記事は「人が作成」) が出て、「人は未確認」の注釈は無い と原文のリンクがある
//   5. <道>/index.html でも描いたあとの見出しが同じページのもの。題・説明に $& や $$ があっても書き込みが壊れない
//   7. 攻略 (guide/): 節がすべて出て、公式のお知らせの出典ごとと版ごとに Steam の原文のリンクがある。
//      記事がある出典はサイト内の要約にも飛ぶ。攻略サイトの情報は欄を分け、出典ごとにリンクがある
//   6. SEO: og:title が題と同じ、canonical と og:url がある (404 は無く noindex)、JSON-LD が読めて種類が合う、
//      sitemap.xml に全ページがあり 404 は無い、ファビコン・ホーム画面用の画像・共有の画像が 200
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

import { readFileSync } from 'node:fs';

const guide = JSON.parse(readFileSync('data/guide.json', 'utf8'));
const versions = JSON.parse(readFileSync('data/versions.json', 'utf8')).versions;
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
  { path: '', heading: '【見本】グランドホテルの戦利品を調整', ld: 'WebSite' },
  { path: 'news/', heading: '記事一覧' },
  // 攻略: 出典ごとに Steam の原文のリンクがあり、アップデートの履歴に版の数だけ原文のリンクがある
  { path: 'guide/', heading: 'いまわかっている ROB RUN の仕組み', guide: true },
  { path: 'articles/fixture-p032/', heading: '【見本】グランドホテルの戦利品を調整', article: true, version: '2026-11-20 版', old: false, ld: 'NewsArticle' },
  { path: 'articles/fixture-raid/', heading: '【見本】今週の Federal Raid の時刻を告知', article: true, version: '2026-11-17 版', old: true },
  // GitHub Pages は <道>/index.html にも同じ HTML を返す。描いたあとに 404 に変わらないこと
  { path: 'news/index.html', heading: '記事一覧' },
  { path: 'articles/fixture-p032/index.html', heading: '【見本】グランドホテルの戦利品を調整', article: true },
  // 題と説明に $& と $$ がある見本。HTML への書き込みが $ の並びで壊れないこと
  // 人が要約した記事 (summarizedBy: human) なので「人が作成」と出る
  { path: 'articles/fixture-dollar/', heading: '【見本】報酬 $$500 と $& の表示', article: true, summary: '人が作成', description: '報酬が $$500 増える' },
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
  // sitemap とファビコン・画像 (6)
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  for (const loc of ['', 'news/', 'guide/', 'articles/fixture-p032/', 'articles/fixture-dollar/']) {
    if (!sitemap.includes(`<loc>https://maco165.github.io/robrun-jp/${loc}</loc>`)) fails.push(`sitemap.xml に ${loc || '/'} が無い`);
  }
  if (sitemap.includes('404')) fails.push('sitemap.xml に 404 がある');
  for (const f of ['favicon.svg', 'apple-touch-icon.png', 'og.png']) {
    const res = await fetch(BASE + f);
    if (!res.ok) fails.push(`${f} が ${res.status}`);
  }
  const browser = await chromium.launch();
  for (const p of PAGES) {
    const raw = await (await fetch(BASE + p.path)).text();
    // HTML では & が &amp; に逃がされる
    if (!raw.includes(p.heading.replace(/&/g, '&amp;'))) fails.push(`${p.path || '/'}: 事前描画の HTML に見出し「${p.heading}」が無い`);
    if (p.description && !/<meta name="description" content="[^"]*/.exec(raw)?.[0].includes(p.description)) fails.push(`${p.path}: meta description に「${p.description}」が無い`);
    // SEO (6)
    const title = /<title>([^<]*)<\/title>/.exec(raw)?.[1];
    if (!raw.includes(`<meta property="og:title" content="${title}" />`)) fails.push(`${p.path || '/'}: og:title が題と違う`);
    const is404 = p.path === '404.html';
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(raw)?.[1];
    const ogUrl = /<meta property="og:url" content="([^"]*)"/.exec(raw)?.[1];
    if (is404) {
      if (canonical || ogUrl || !raw.includes('<meta name="robots" content="noindex" />')) fails.push('404.html: canonical・og:url が残るか noindex が無い');
    } else {
      const want = `https://maco165.github.io/robrun-jp/${p.path.replace(/index\.html$/, '')}`;
      if (canonical !== want || ogUrl !== want) fails.push(`${p.path || '/'}: canonical/og:url が ${want} でない (${canonical} / ${ogUrl})`);
    }
    const ld = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(raw)?.[1];
    if (p.ld) {
      let type = '';
      try { type = JSON.parse(ld ?? '')['@type']; } catch { /* 読めない */ }
      if (type !== p.ld) fails.push(`${p.path || '/'}: JSON-LD の @type が ${p.ld} でない (${type || '読めない'})`);
    }
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
        const summary = p.summary ?? 'AI が作成';
        if (!text?.includes(summary)) fails.push(`${p.path} @${w}: 「${summary}」が無い`);
        if (text?.includes('未確認') || text?.includes('まだ確認していない')) fails.push(`${p.path} @${w}: 人の確認の注釈が出ている`);
        // 版 (R-14): 対象の版が出て、いまの版より古い記事にだけ【古い版の情報】が出る
        if (p.version && !text?.includes(p.version)) fails.push(`${p.path} @${w}: 版「${p.version}」が無い`);
        if (p.old !== undefined && (text?.includes('古い版の情報') ?? false) !== p.old) fails.push(`${p.path} @${w}: 【古い版の情報】が${p.old ? '無い' : '出ている'}`);
        const src = await page.locator('a[href^="https://store.steampowered.com/"]').count();
        if (src === 0) fails.push(`${p.path} @${w}: 原文のリンクが無い`);
      }
      if (p.guide) {
        const refs = guide.sections.flatMap((sec) => sec.items.flatMap((it) => it.refs)).filter((r) => r.news).length;
        const steamLinks = await page.locator('main a[href^="https://store.steampowered.com/news/app/4262460/view/"]').count();
        if (steamLinks < refs + versions.length) fails.push(`${p.path} @${w}: Steam の原文のリンクが ${steamLinks} 件 (出典 ${refs} 件 + 履歴 ${versions.length} 件より少ない)`);
        const text = (await page.textContent('main')) ?? '';
        for (const sec of guide.sections) if (!text.includes(sec.title)) fails.push(`${p.path} @${w}: 節「${sec.title}」が無い`);
        // 見本に記事がある公式のお知らせ (1848557880479055) は、サイト内の要約にも飛ぶ
        if ((await page.locator('main a[href$="/articles/1848557880479055/"]').count()) === 0) fails.push(`${p.path} @${w}: 記事がある出典からサイト内の要約へのリンクが無い`);
        // 攻略サイトの情報は欄を分けて出し、出典ごとにリンクがある
        const siteRefs = guide.sections.flatMap((sec) => sec.items.filter((it) => it.kind === 'site').flatMap((it) => it.refs)).filter((r) => r.site);
        if (siteRefs.length && !text.includes('攻略サイトの情報')) fails.push(`${p.path} @${w}: 「攻略サイトの情報」の欄が無い`);
        for (const r of siteRefs) if ((await page.locator(`main a[href="${r.site}"]`).count()) === 0) fails.push(`${p.path} @${w}: 攻略サイトのリンク ${r.site} が無い`);
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
