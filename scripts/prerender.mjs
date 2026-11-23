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

function fill(template, page, body, origin) {
  // 404 は canonical を書かず、検索に載せない (知らない道すべてがトップと名乗らないように)
  const head = page.path === '404.html'
    ? '<meta name="robots" content="noindex" />'
    : `<link rel="canonical" href="${esc(`${origin}${BASE}${page.path}`)}" />`;
  // 置き換え先は関数で渡す (文字列だと data の $& や $$ を replace が特別に読んで壊す)
  const out = template
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, () => `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => head)
    .replace(/<div id="root"><!--ssr-start-->[\s\S]*?<!--ssr-end--><\/div>/, () => `<div id="root" data-ssr="1">${body}</div>`);
  // 置き換えの目印が 1 つでも外れたら止める (題や本文が準備中の案内のまま公開されるのを防ぐ)
  if (out.includes('<!--ssr-start-->') || !out.includes('data-ssr="1"') || !out.includes(`<title>${esc(page.title)}</title>`)) {
    throw new Error(`prerender: ${page.path} の HTML を組み立てられません (index.html の目印を確かめる)`);
  }
  return out;
}

const { render, sitePages, NOT_FOUND, ORIGIN } = await import(pathToFileURL(path.join(SSR, 'entry-server.js')).href);
const template = await readFile(path.join(OUT, 'index.html'), 'utf8');
const pages = sitePages();
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
// 公開の確かめの印: どのコミットから組んだか (更新の workflow が、公開まで届いたかをこれで見る)
let commit = 'unknown';
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* git の外で組んだ */ }
await writeFile(path.join(OUT, 'build.json'), JSON.stringify({ commit, builtAt: new Date().toISOString() }) + '\n');
await rm(SSR, { recursive: true, force: true });
console.log(`prerender: ${pages.length} ページと 404.html を書きました (${path.relative(ROOT, OUT)})`);
