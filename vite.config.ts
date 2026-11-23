import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages では https://maco165.github.io/robrun-jp/ に置かれる
const BASE = '/robrun-jp/';

// 記事のデータ。既定は data/news.json。npm run e2e は見本 (tests/fixtures/news.json) を ROBRUN_NEWS で渡す
const NEWS = process.env.ROBRUN_NEWS ?? 'data/news.json';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  // 知らない道にトップの HTML を返さない (GitHub Pages と同じく、事前描画したページだけを返す)
  appType: 'mpa',
  resolve: {
    alias: { '@news': fileURLToPath(new URL(NEWS, import.meta.url)) },
  },
  build: {
    // npm run e2e は見本のデータで組むので、公開用の dist と分ける
    outDir: process.env.ROBRUN_OUT ?? 'dist',
  },
  // Astryx の部品は事前描画のときも vite で束ねる (パッケージの中の CSS の import を Node が読めないため)
  ssr: { noExternal: [/^@astryxdesign\//] },
});
