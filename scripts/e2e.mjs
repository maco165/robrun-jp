#!/usr/bin/env node
// ブラウザでの通しの検査 (npm run e2e)。見本の記事 (tests/fixtures/news.json) で dist-e2e に組み、vite preview で配り、Playwright の Chromium で開く。
// 1280px と 390px の幅のそれぞれで、トップ・記事一覧・記事・404 について次を確かめる:
//   1. JS を動かす前の HTML (事前描画) に、そのページの見出しの文字列がある
//   2. 横にはみ出さない (document.documentElement.scrollWidth が幅以下)
//   3. ページのエラーと、描画の食い違い (hydration) の警告が無い
//   4. 記事の画面に情報欄の要約に「AI が作成」(人が要約した記事は「人が作成」) が出て、「人は未確認」の注釈は無い と原文のリンクがある
//   5. <道>/index.html でも描いたあとの見出しが同じページのもの。題・説明に $& や $$ があっても書き込みが壊れない
//   7. 攻略: 入口 (guide/) にジャンルがすべて並ぶ。ジャンルのページ (guide/<id>/) に図がすべて出て、本文と図には出典の番号、
//      出典は末尾に 1 件 1 行・1 本ずつまとまる。記事がある出典はサイト内の要約にも飛ぶ。攻略サイトの情報には印が付く
//   6. SEO: og:title が題と同じ、canonical と og:url がある (404 は無く noindex)、JSON-LD が読めて種類が合う、
//      sitemap.xml に全ページがあり 404 は無い、ファビコン・ホーム画面用の画像・共有の画像が 200
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

import { readFileSync } from 'node:fs';

const guide = JSON.parse(readFileSync('data/guide.json', 'utf8'));
const gear = JSON.parse(readFileSync('data/gear.json', 'utf8'));
const links = JSON.parse(readFileSync('data/links.json', 'utf8'));
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
  { path: 'articles/1848557880479055/', heading: '【見本】発売に向けた最初の変更点', related: true },
  // リンク集: data/links.json のサイトがすべて外部リンクで並ぶ
  { path: 'links/', heading: 'ROB RUN の役に立つサイト', links: true },
  // 感度変換: 既定 (CS2 1・800 DPI) で 0.213 が出て、感度を 2 にすると 0.427 になる
  { path: 'tools/sensitivity/', heading: 'ROB RUN 感度変換', sens: true },
  // 攻略のジャンルごとのページ: 図・出典の番号・末尾にまとめた出典
  ...guide.sections.map((sec) => ({ path: `guide/${sec.id}/`, heading: sec.title, genre: sec })),
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

// detached で別のプロセスグループにし、終わりにグループごと止める (npx だけ止めると vite preview が残る)
const server = spawn('npx', ['vite', 'preview', '--outDir', OUT, '--port', String(PORT), '--strictPort'], { env, stdio: 'ignore', detached: true });
const fails = [];
try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* まだ立ち上がっていない */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  // sitemap とファビコン・画像 (6)
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  for (const loc of ['', 'news/', 'guide/', 'links/', 'tools/sensitivity/', 'guide/gear/', 'guide/start/', 'articles/fixture-p032/', 'articles/fixture-dollar/']) {
    if (!sitemap.includes(`<loc>https://maco165.github.io/robrun-jp/${loc}</loc>`)) fails.push(`sitemap.xml に ${loc || '/'} が無い`);
  }
  if (sitemap.includes('404')) fails.push('sitemap.xml に 404 がある');
  for (const f of ['favicon.svg', 'apple-touch-icon.png', 'og.png']) {
    const res = await fetch(BASE + f);
    if (!res.ok) fails.push(`${f} が ${res.status}`);
  }
  const browser = await chromium.launch();
  // まとめ直す前の URL (guide/sell/ など) は、いまの見出しへ転送される
  for (const [old, to] of Object.entries(guide.moved)) {
    const page = await browser.newPage();
    await page.goto(`${BASE}guide/${old}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    if (page.url() !== `${BASE}guide/${to}`) fails.push(`guide/${old}/ の転送先が ${page.url()}`);
    if (sitemap.includes(`/guide/${old}/<`)) fails.push(`sitemap.xml に転送元 guide/${old}/ がある`);
    await page.close();
  }
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
    // 攻略のジャンル: 共有の画像がジャンルのもので開け、構造化データに記事とパンくずがある
    if (p.genre) {
      const og = /<meta property="og:image" content="([^"]*)"/.exec(raw)?.[1] ?? '';
      if (!og.endsWith(`/img/og-guide-${p.genre.id}.png`)) fails.push(`${p.path}: og:image がジャンルの画像でない (${og})`);
      for (const img of [`img/og-guide-${p.genre.id}.png`, `img/guide-${p.genre.id}.png`]) {
        const res = await fetch(BASE + img);
        if (!res.ok) fails.push(`${p.path}: ${img} が ${res.status}`);
      }
      let types = [];
      try { types = JSON.parse(ld ?? '')['@graph'].map((x) => x['@type']); } catch { /* 読めない */ }
      if (!types.includes('Article') || !types.includes('BreadcrumbList')) fails.push(`${p.path}: JSON-LD に Article と BreadcrumbList が無い (${types.join(',') || '読めない'})`);
    }
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
      if (((await page.textContent('footer')) ?? '').includes('AI が作っています')) fails.push(`${p.path || '/'} @${w}: フッターに AI の注記が残っている`);
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
        // 出典 (原文) は閉じてあり、「出典」を開くと見える
        const orig = page.locator('main a[href^="https://store.steampowered.com/"]').first();
        if (await orig.isVisible()) fails.push(`${p.path} @${w}: 出典 (原文) が最初から見えている`);
        await page.locator('main').getByText('出典', { exact: true }).click();
        await page.waitForTimeout(300);
        if (!(await orig.isVisible())) fails.push(`${p.path} @${w}: 「出典」を開いても原文が見えない`);
      }
      // 見出しの段を飛ばさない (h1 の次に h3 など)
      const levels = await page.$$eval('h1,h2,h3,h4', (hs) => hs.map((h) => Number(h.tagName[1])));
      if (levels.some((l, k) => k > 0 && l - levels[k - 1] > 1)) fails.push(`${p.path || '/'} @${w}: 見出しの段が飛ぶ (${levels.join(',')})`);
      // 攻略の出典になっている記事から、その攻略へ飛べる
      if (p.related && (await page.locator('main a[href*="/guide/"]').count()) === 0) fails.push(`${p.path} @${w}: 関連する攻略のリンクが無い`);
      if (p.guide) {
        // 入口: ジャンルがすべて並び、それぞれのページへ飛べる。履歴に版の数だけ Steam の原文
        const text = (await page.textContent('main')) ?? '';
        for (const sec of guide.sections) {
          if (!text.includes(sec.title)) fails.push(`${p.path} @${w}: ジャンル「${sec.title}」が無い`);
          if ((await page.locator(`main a[href$="/guide/${sec.id}/"]`).count()) === 0) fails.push(`${p.path} @${w}: guide/${sec.id}/ へのリンクが無い`);
        }
        const steamLinks = await page.locator('main a[href^="https://store.steampowered.com/news/app/4262460/view/"]').count();
        if (steamLinks < versions.length) fails.push(`${p.path} @${w}: 履歴の Steam の原文のリンクが ${steamLinks} 件 (版 ${versions.length} 件より少ない)`);
      }
      // 上のメニュー: 5 項目があり、今いるページの項目だけに aria-current。メニューは 1 行 (高さ 64px 以下) で、スクロールしても上に残る
      const navItems = page.locator('header nav a');
      if ((await navItems.count()) !== 5) fails.push(`${p.path || '/'} @${w}: メニューの項目が ${await navItems.count()} 個`);
      const want = p.path === '404.html' ? null : p.path === '' ? 'ホーム' : /^(news|articles)\//.test(p.path) ? '記事' : p.path.startsWith('guide/') ? '攻略' : p.path.startsWith('tools/') ? '感度' : p.path.startsWith('links/') ? 'リンク' : null;
      const cur = page.locator('header nav a[aria-current="page"]');
      const curText = (await cur.count()) === 1 ? ((await cur.textContent()) ?? '') : '';
      if (want ? !curText.includes(want) : (await cur.count()) !== 0) fails.push(`${p.path || '/'} @${w}: 今いるページの印が「${curText || 'なし'}」(${want ?? 'なし'} のはず)`);
      const navBox = await page.locator('header nav').boundingBox();
      if (!navBox || navBox.height > 64) fails.push(`${p.path || '/'} @${w}: メニューが 1 行に収まらない (高さ ${navBox?.height})`);
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(150);
      const headTop = (await page.locator('header').boundingBox())?.y ?? -1;
      if (headTop !== 0 && (await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 100))) fails.push(`${p.path || '/'} @${w}: スクロールするとメニューが上に残らない (y=${headTop})`);
      await page.mouse.wheel(0, -100000);
      if (p.sens) {
        const main = page.locator('main');
        // 係数と出典は閉じてあり、開くと見える
        const src = page.locator('main a[href*="robrunstash"]');
        if (await src.isVisible()) fails.push(`${p.path} @${w}: 係数と出典が最初から見えている`);
        await page.getByText('使っている係数と出典').click();
        await page.waitForTimeout(300);
        if (!(await src.isVisible())) fails.push(`${p.path} @${w}: 「使っている係数と出典」を開いても出典が見えない`);
        if (!((await main.textContent()) ?? '').includes('0.213')) fails.push(`${p.path} @${w}: 既定の変換結果 0.213 が無い`);
        const input = page.getByLabel('Counter-Strike 2 / CS:GO の感度');
        await input.fill('2');
        await input.press('Enter');
        await page.waitForTimeout(200);
        if (!((await main.textContent()) ?? '').includes('0.427')) fails.push(`${p.path} @${w}: 感度 2 の変換結果 0.427 が無い`);
        // ROB RUN で使う DPI だけを 1600 にすると半分 (0.427 → 0.213)。元の DPI と取り違えると変わらない
        const rrDpi = page.getByLabel('ROB RUN で使う DPI');
        await rrDpi.fill('1600');
        await rrDpi.press('Enter');
        await page.waitForTimeout(200);
        const after = (await main.textContent()) ?? '';
        if (!after.includes('0.213') || after.includes('0.427')) fails.push(`${p.path} @${w}: ROB RUN の DPI 1600 で 0.213 にならない`);
      }
      if (p.links) {
        for (const e of links.groups.flatMap((g) => g.items)) {
          if ((await page.locator(`main a[href="${e.url}"]`).count()) === 0) fails.push(`${p.path} @${w}: ${e.name} のリンクが無い`);
        }
      }
      if (p.genre) {
        const sec = { ...p.genre, figures: p.genre.parts.flatMap((x) => x.figures), items: p.genre.parts.flatMap((x) => x.items) };
        // ページの中の見出し: すべてあり、目次から飛べる
        for (const x of sec.parts) {
          if ((await page.locator(`main section#${x.id}`).count()) !== 1) fails.push(`${p.path} @${w}: 見出し ${x.id} が無い`);
          if (sec.parts.length > 1 && (await page.locator(`main nav a[href="#${x.id}"]`).count()) !== 1) fails.push(`${p.path} @${w}: 目次に ${x.id} が無い`);
        }
        const text = (await page.textContent('main')) ?? '';
        if (sec.id === 'gear') {
          const cards = page.locator('main [data-gear]');
          const count = (t) => gear.weapons.flatMap((x) => x.marks).filter((m) => m.tier === t).length;
          if ((await cards.count()) !== count(1)) fails.push(`${p.path} @${w}: T1 の武器が ${await cards.count()} 件 (${count(1)} 件のはず)`);
          await page.getByRole('radio', { name: 'T2' }).click();
          await page.waitForTimeout(200);
          if ((await cards.count()) !== count(2)) fails.push(`${p.path} @${w}: T2 に替えると ${await cards.count()} 件 (${count(2)} 件のはず)`);
          // ページ内の目次の行き先・並べ替え・種類の絞り込み・探索の段・刑期・武器の選択
          for (const x of ['gear-tier', 'gear-mk', 'gear-armor']) if ((await page.locator(`main section#${x}`).count()) !== 1) fails.push(`${p.path} @${w}: ${x} が無い`);
          const marks = gear.weapons.flatMap((x) => x.marks.map((m) => ({ ...m, n: `${x.name} Mk${m.mk}`, type: x.type, dps: Math.round((x.damage * x.pellets * x.rpm) / 60), c: m.total === null ? null : m.total + m.price + gear.land[m.tier] })));
          const names = () => cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-gear')));
          await page.getByRole('radio', { name: '全部' }).click();
          await page.waitForTimeout(200);
          const byDps = (await names()).map((n) => marks.find((m) => m.n === n).dps);
          if (byDps.length !== marks.length || byDps.some((x, k) => k > 0 && x > byDps[k - 1])) fails.push(`${p.path} @${w}: 秒間ダメージの順が違う`);
          const choose = async (label, option) => { await page.getByRole('combobox', { name: label, exact: true }).click(); await page.waitForTimeout(300); await page.getByRole('option', { name: option }).first().evaluate((el) => el.click()); await page.waitForTimeout(250); };
          await choose('並べ方', '土地込みで安い順');
          const byCost = (await names()).map((n) => marks.find((m) => m.n === n).c).filter((x) => x !== null);
          if (byCost.some((x, k) => k > 0 && x < byCost[k - 1])) fails.push(`${p.path} @${w}: 土地込みで安い順が違う`);
          await choose('種類', 'SMG');
          if ((await names()).length !== marks.filter((m) => m.type === 'SMG').length) fails.push(`${p.path} @${w}: 種類の絞り込みが効かない`);
          await choose('種類', 'すべての種類');
          await page.getByRole('radio', { name: '探索' }).click();
          await page.waitForTimeout(200);
          if ((await names()).length !== marks.filter((m) => m.tier === null).length) fails.push(`${p.path} @${w}: 探索の段の件数が違う`);
          if ((await page.locator('main [data-mk="2"] .rr-gain').count()) === 0) fails.push(`${p.path} @${w}: 良くなる所の色が付かない`);
          const mk3 = (await page.locator('main [data-mk="3"]').textContent()) ?? '';
          for (const x of ['30 → 45発', '$181,000', '$175,000']) if (!mk3.includes(x)) fails.push(`${p.path} @${w}: KL-545 Mk3 に「${x}」が無い`);
          await choose('武器', 'STAR-H');
          if (!((await page.locator('main [data-mk="3"]').textContent()) ?? '').includes('200 年')) fails.push(`${p.path} @${w}: STAR-H を選んでも刑期 200 年が出ない`);
          if ((await page.locator('main [data-armor]').count()) !== gear.armor.length) fails.push(`${p.path} @${w}: 防具の数が違う`);
        }
        // 図: 数が合い、図ごとに題・中身の文字・出典の番号がその図の中にあり、攻略サイトの図には印がある
        const figs = page.locator('main figure');
        if ((await figs.count()) !== sec.figures.length) fails.push(`${p.path} @${w}: 図が ${await figs.count()} 個 (${sec.figures.length} 個のはず)`);
        for (const [k, f] of sec.figures.entries()) {
          const fig = figs.nth(k);
          const ft = (await fig.textContent()) ?? '';
          const words = f.type === 'flow' ? f.steps.map((x) => x.title) : f.type === 'pyramid' ? f.tiers.map((x) => x.title)
            : f.type === 'table' ? f.rows.map((r) => r[0]) : f.type === 'bars' ? f.bars.map((b) => b.label) : f.type === 'map' ? f.zones.map((z) => z.label) : f.columns.flatMap((c) => c.items);
          for (const x of [f.title, ...words]) if (!ft.includes(x)) fails.push(`${p.path} @${w}: 図「${f.title}」に「${x}」が無い`);
          if ((await fig.locator('a[href^="#src-"]').count()) === 0) fails.push(`${p.path} @${w}: 図「${f.title}」に出典の番号が無い`);
          if (f.kind === 'site' && !ft.includes('攻略サイトの情報')) fails.push(`${p.path} @${w}: 図「${f.title}」に攻略サイトの印が無い`);
        }
        // 出典はページの末尾に 1 回ずつまとめる: 出典の数だけ番号の行があり、公式のお知らせの原文は 1 件に 1 本だけ
        const all = [...sec.figures.flatMap((f) => f.refs), ...sec.items.flatMap((it) => it.refs)];
        const keys = [...new Set(all.map((r) => r.news ? `news:${r.news}` : r.help ?? r.site))];
        const rows = await page.locator('main [id^="src-"]').count();
        if (rows !== keys.length) fails.push(`${p.path} @${w}: 出典の一覧が ${rows} 行 (出典 ${keys.length} 件と違う)`);
        for (const r of all) {
          const href = r.news ? `https://store.steampowered.com/news/app/4262460/view/${r.news}` : r.help ?? r.site;
          const n = await page.locator(`main [id^="src-"] a[href="${href}"]`).count();
          if (n !== 1) fails.push(`${p.path} @${w}: 出典 ${href} のリンクが ${n} 本 (まとめて 1 本のはず)`);
        }
        // 見本に記事がある公式のお知らせ (1848557880479055) は、サイト内の要約にも飛ぶ
        if (all.some((r) => r.news === '1848557880479055') && (await page.locator('main a[href$="/articles/1848557880479055/"]').count()) === 0) {
          fails.push(`${p.path} @${w}: 記事がある出典からサイト内の要約へのリンクが無い`);
        }
        // 攻略サイトの情報は印を付けて分ける
        const hasSite = sec.items.some((it) => it.kind === 'site') || sec.figures.some((f) => f.kind === 'site');
        if (hasSite && !text.includes('攻略サイトの情報')) fails.push(`${p.path} @${w}: 「攻略サイトの情報」の印が無い`);
        // 出典は閉じてあり、本文か図の [1] を押すと開いて 1 行目が見える
        const row1 = page.locator('main #src-1');
        if (await row1.isVisible()) fails.push(`${p.path} @${w}: 出典が最初から見えている`);
        await page.locator('main a[href="#src-1"]').first().click();
        await page.waitForTimeout(400);
        if (!(await row1.isVisible())) fails.push(`${p.path} @${w}: [1] を押しても出典が開かない`);
        // 本文と図に出典の番号が付く
        const marks = await page.locator('main a[href^="#src-"]').count();
        if (marks < sec.items.length + sec.figures.length) fails.push(`${p.path} @${w}: 出典の番号が ${marks} 個 (項目と図の数より少ない)`);
      }
      await page.close();
    }
  }
  await browser.close();
} finally {
  try { process.kill(-server.pid); } catch { server.kill(); }
}

if (fails.length) {
  for (const f of fails) console.log(`NG ${f}`);
  process.exit(1);
}
console.log(`e2e: OK (${PAGES.length} ページ × ${WIDTHS.length} 幅)`);
