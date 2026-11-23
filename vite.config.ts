import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages では https://maco165.github.io/robrun-jp/ に置かれる
const BASE = '/robrun-jp/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
});
