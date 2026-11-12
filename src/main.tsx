import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const query = new URLSearchParams(window.location.search);
const isStudio = query.has('studio');
// two workshop routes beside the site itself: the studio that renders the watch, and the sheet of plates
const Root = isStudio ? lazy(() => import('./studio/Studio')) : query.has('plates') ? lazy(() => import('./plates/Gallery')) : lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  isStudio ? (
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  ) : (
    <StrictMode>
      <Suspense fallback={null}>
        <Root />
      </Suspense>
    </StrictMode>
  ),
);
