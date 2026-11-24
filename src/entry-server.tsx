// 事前描画の入口 (vite build --ssr)。scripts/prerender.mjs が読む
import { renderToString } from 'react-dom/server';
import { StrictMode } from 'react';
import App from './App';
import { sitePages, MOVED, NOT_FOUND, ORIGIN } from './routes';

export { sitePages, MOVED, NOT_FOUND, ORIGIN };

export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  );
}
