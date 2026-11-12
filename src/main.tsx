import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

const isStudio = new URLSearchParams(window.location.search).has('studio');
const Root = isStudio ? lazy(() => import('./studio/Studio')) : lazy(() => import('./App'));

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
