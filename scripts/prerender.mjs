// vite build (画面) と vite build --ssr (事前描画の入口) のあとに、ページごとの HTML を書き出す (npm run build の最後の段)。
// GitHub Pages は <道>/index.html を返すので、# の無い URL (/robrun-jp/news/ など) がそのまま開ける。
// 検索エンジンと SNS が JS を動かさなくても、題・説明・canonical・本文を読めるようにする。知らない道は 404.html。
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.ROBRUN_OUT ?? 'dist');
const SSR = path.join(OUT, '.ssr');
const BASE = '/robrun-jp/';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** JSON-LD を <script> に入れる。</script> などで抜け出さないよう < を逃がす */
const jsonLdText = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

function fill(template, page, body, origin) {
  const notFound = page.path === '404.html';
  const url = `${origin}${BASE}${page.path}`;
  // 404 は canonical と og:url を書かず、検索に載せない (知らない道すべてがトップと名乗らないように)
  const head = notFound ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${esc(url)}" />`;
  // 置き換え先は関数で渡す (文字列だと data の $& や $$ を replace が特別に読んで壊す)
  let out = template
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => head)
    .replace(/<meta property="og:type" content="[^"]*" \/>/, () => `<meta property="og:type" content="${page.ogType}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, () => `<meta property="og:title" content="${esc(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, () => `<meta property="og:description" content="${esc(page.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, () => (notFound ? '' : `<meta property="og:url" content="${esc(url)}" />`));
  if (page.jsonLd) out = out.replace('</head>', () => `  <script type="application/ld+json">${jsonLdText(page.jsonLd)}</script>\n  </head>`);
  out = out
    .replace(/<div id="root"><!--ssr-start-->[\s\S]*?<!--ssr-end--><\/div>/, () => `<div id="root" data-ssr="1">${body}</div>`);
  // 置き換えの目印が 1 つでも外れたら止める (題や本文が準備中の案内のまま公開されるのを防ぐ)
  if (out.includes('<!--ssr-start-->') || !out.includes('data-ssr="1"') || !out.includes(`<title>${esc(page.title)}</title>`)
    || !out.includes(`<meta property="og:title" content="${esc(page.title)}" />`)) {
    throw new Error(`prerender: ${page.path} の HTML を組み立てられません (index.html の目印を確かめる)`);
  }
  return out;
}

const { render, sitePages, NOT_FOUND, ORIGIN } = await import(pathToFileURL(path.join(SSR, 'entry-server.js')).href);
const template = await readFile(path.join(OUT, 'index.html'), 'utf8');
const pages = sitePages();
/** 検索に載せるページだけ。作るたびの日付 (lastmod) は付けない (正しい更新日でないと検索エンジンが信用しないため) */
const sitemapXml = (list, origin) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list
    .map((p) => `  <url><loc>${esc(`${origin}${BASE}${p.path}`)}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
// 見本の記事 (tests/fixtures/、id が fixture-) を公開用の dist に入れない (ROBRUN_NEWS の有無によらず、出力先で決める)
if (OUT === path.join(ROOT, 'dist') && pages.some((p) => p.path.startsWith('articles/fixture-'))) {
  throw new Error('prerender: 公開用のビルドに見本の記事 (fixture-) が入っています');
}
for (const page of pages) {
  // 道は英数字・_・- と / だけ。OUT の外へ書かない
  if (!/^(?:[A-Za-z0-9_-]+\/)*$/.test(page.path)) throw new Error(`prerender: 道の形が違います (${page.path})`);
  const dir = path.join(OUT, page.path);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), fill(template, page, render(page.path), ORIGIN));
}
await writeFile(path.join(OUT, '404.html'), fill(template, NOT_FOUND, render('404.html'), ORIGIN));
await writeFile(path.join(OUT, 'sitemap.xml'), sitemapXml(pages, ORIGIN));
// 公開の確かめの印: どのコミットから組んだか (更新の workflow が、公開まで届いたかをこれで見る)
let commit = 'unknown';
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* git の外で組んだ */ }
await writeFile(path.join(OUT, 'build.json'), JSON.stringify({ commit, builtAt: new Date().toISOString() }) + '\n');
await rm(SSR, { recursive: true, force: true });
console.log(`prerender: ${pages.length} ページと 404.html・sitemap.xml を書きました (${path.relative(ROOT, OUT)})`);
