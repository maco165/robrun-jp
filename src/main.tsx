import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './themes/robrun/robrun.css';
// 書体は同梱して配る (外部の CDN から読まない)。本文と見出しは Noto Sans JP、Dela Gothic One はサイト名と特集の見出しだけ
// 宣言だけで 100KB を超えるので、表示を止めないよう後から読む (src/fonts.ts)
import './styles.css';
import App from './App';

void import('./fonts');

const root = document.getElementById('root')!;
const path = location.pathname.startsWith(import.meta.env.BASE_URL) ? location.pathname.slice(import.meta.env.BASE_URL.length) : '';
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
);
// 事前描画した HTML (data-ssr) にはそのまま繋ぐ。開発中 (npm run dev) は事前描画が無いので描き直す
if (root.dataset.ssr === '1') hydrateRoot(root, app);
else createRoot(root).render(app);
