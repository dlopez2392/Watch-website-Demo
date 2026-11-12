import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hasWebGL2, prefersReducedMotion } from '../lib/env';
import { ScrollTrigger, scrollToId } from '../lib/motion';
import { SCROLL } from '../hero/layout';
import { getVersion, hero, subscribe } from '../hero/store';
import Annotation from './Annotation';
import PageDrawing from './PageDrawing';
import PartsIndex from './PartsIndex';

const HeroCanvas = lazy(() => import('../hero/HeroCanvas'));

const pad = (n: number) => String(n).padStart(2, '0');

export default function Hero() {
  const [mode] = useState<'live' | 'static'>(() => (prefersReducedMotion() || !hasWebGL2() ? 'static' : 'live'));
  const wrap = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  useSyncExternalStore(subscribe, getVersion);

  useEffect(() => {
    const el = wrap.current;
    if (!el || mode !== 'live') return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        hero.scroll = self.progress;
        el.style.setProperty('--s', self.progress.toFixed(4));
        const p = self.progress;
        el.dataset.phase = p < SCROLL.travel0 ? 'open' : p < SCROLL.travel1 ? 'travel' : p < SCROLL.close1 - 0.06 ? 'closing' : 'closed';
      },
    });
    const io = new IntersectionObserver(([e]) => {
      hero.inView = e.isIntersecting;
      setInView(e.isIntersecting);
    });
    io.observe(el);
    return () => {
      st.kill();
      io.disconnect();
    };
  }, [mode]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20000);
    return () => window.clearInterval(id);
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToId(id);
  };

  return (
    <section className="hero" id="top" ref={wrap} data-mode={mode} data-phase="open" data-ready={hero.ready || mode === 'static'} aria-label="The Codice 39, taken apart">
      <div className="hero-pin">
        <PageDrawing />

        {mode === 'live' ? (
          <div className="hero-canvas">
            <Suspense fallback={null}>
              <HeroCanvas active={inView} />
            </Suspense>
          </div>
        ) : (
          <img
            className="hero-fallback"
            src="/img/hero-fallback.webp"
            width={1800}
            height={1200}
            alt="The Codice 39 drawn in exploded view: crystal, dial, movement, case and strap separated along one axis, part in ink and part in polished steel."
          />
        )}

        <div className="hero-copy" ref={copy}>
          <p className="hero-over sc">Manifattura Orologiera · Firenze</p>
          <h1 className="hero-title">Valdarno</h1>
          <p className="hero-line">A watch, drawn before it is built.</p>
          <a className="cta" href="#riserva" onClick={go('riserva')}>
            Reserve the Codice 39 <span className="arrow" aria-hidden="true" />
          </a>
        </div>

        {mode === 'live' && (
          <>
            <Annotation avoid={copy} />
            <PartsIndex />
          </>
        )}

        <div className="hero-caption">
          <p className="label">Tav. I</p>
          <p className="hero-caption-title">Codice 39, veduta esplosa</p>
          {mode === 'live' && <p className="hero-hint label">{touch ? 'Tap a part · drag to turn' : 'Point at a part · drag to turn'}</p>}
        </div>

        <div className="hero-closed" aria-hidden={mode === 'static'}>
          <p className="numeral">I</p>
          <h2 className="display">
            Codice <em>39</em>
          </h2>
          <p className="lede">Thirty-nine millimetres, wound by hand, with the seconds on a dial of their own.</p>
          <dl className="hero-facts">
            <div>
              <dt className="label">Calibre</dt>
              <dd>V.31, 19 jewels</dd>
            </div>
            <div>
              <dt className="label">Beat</dt>
              <dd>21,600 A/h</dd>
            </div>
            <div>
              <dt className="label">Reserve</dt>
              <dd>50 hours</dd>
            </div>
          </dl>
          <p className="hero-time hand">
            {pad(now.getHours())}:{pad(now.getMinutes())}, la tua ora
          </p>
          <p className="hero-time-en">The hands are set to your time.</p>
        </div>

        <a className="hero-scroll label" href="#movimento" onClick={go('movimento')}>
          <span>Scroll, part by part</span>
          <i aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
