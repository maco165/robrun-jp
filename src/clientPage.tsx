// 開いたページの部品とデータだけを読む。事前描画は routes.tsx が全ページをまとめて描く
import type { ReactElement } from 'react';
import { routeOf } from './lib/route';

async function notFound(): Promise<ReactElement> {
  const { NotFound } = await import('./pages/NotFound');
  return <NotFound />;
}

export async function loadPage(path: string): Promise<ReactElement> {
  const r = routeOf(path);
  switch (r.kind) {
    case 'top': {
      const { Home } = await import('./pages/Home');
      return <Home />;
    }
    case 'news': {
      const { News } = await import('./pages/News');
      return <News />;
    }
    case 'guide': {
      const { GuideIndex } = await import('./pages/Guide');
      return <GuideIndex />;
    }
    case 'links': {
      const { LinksPage } = await import('./pages/Links');
      return <LinksPage />;
    }
    case 'sens': {
      const { Sensitivity } = await import('./pages/Sensitivity');
      return <Sensitivity />;
    }
    case 'genre': {
      const [{ GuideGenre }, { GUIDE }] = await Promise.all([import('./pages/Guide'), import('./lib/guideData')]);
      const section = GUIDE.sections.find((s) => s.id === r.id);
      return section ? <GuideGenre section={section} /> : notFound();
    }
    case 'article': {
      const [{ Article }, { findArticle }] = await Promise.all([import('./pages/Article'), import('./lib/data')]);
      const article = findArticle(r.id);
      return article ? <Article article={article} /> : notFound();
    }
    default:
      return notFound();
  }
}
