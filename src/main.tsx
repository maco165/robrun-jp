import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './themes/robrun/robrun.css';
// 書体は同梱して配る (外部の CDN から読まない)。本文と見出しは Noto Sans JP、Dela Gothic One はサイト名と特集の見出しだけ
import '@fontsource-variable/noto-sans-jp';
import '@fontsource/dela-gothic-one/400.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
