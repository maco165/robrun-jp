/// <reference types="vite/client" />
declare module '@news' {
  const news: import('./lib/types').Article[];
  export default news;
}
