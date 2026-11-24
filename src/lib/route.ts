// 道の判定の正本。事前描画 (routes.tsx) と画面 (clientPage.tsx) の両方がここを使う
export type Route = { kind: 'top' | 'news' | 'guide' | 'links' | 'sens' | 'none' } | { kind: 'genre' | 'article'; id: string };

/** base を除いた道を種類に分ける。id が実在するかは呼ぶ側で確かめる */
export function routeOf(path: string): Route {
  // GitHub Pages は <道>/index.html にも同じ HTML を返すので、末尾の index.html を落としてから振り分ける
  const p = path.replace(/^\/+/, '').replace(/(^|\/)index\.html$/, '$1').replace(/\/$/, '');
  if (p === '') return { kind: 'top' };
  if (p === 'news') return { kind: 'news' };
  if (p === 'guide') return { kind: 'guide' };
  if (p === 'links') return { kind: 'links' };
  if (p === 'tools/sensitivity') return { kind: 'sens' };
  const g = /^guide\/([a-z0-9-]+)$/.exec(p);
  if (g) return { kind: 'genre', id: g[1] };
  const a = /^articles\/([A-Za-z0-9_-]+)$/.exec(p);
  if (a) return { kind: 'article', id: a[1] };
  return { kind: 'none' };
}
