import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };

let lenis: Lenis | null = null;

/** Smooth, slightly weighted scrolling. Nothing bounces. */
export function initScroll(): () => void {
  if (prefersReducedMotion()) return () => {};
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

/** `offset` (px, usually negative) leaves room above the target, for the bar at the top of the page. */
export function scrollToId(id: string, offset = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (offset) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  if (el.tabIndex < 0) el.tabIndex = -1;
  el.focus({ preventScroll: true });
}

/** Fade-and-rise for anything marked data-reveal. */
export function initReveals(root: ParentNode = document): () => void {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * Plates draw themselves: every stroke marked data-draw is laid down in document order,
 * then the lettering marked data-fade settles in.
 */
export function initPlates(root: ParentNode = document): () => void {
  const svgs = Array.from(root.querySelectorAll<SVGSVGElement>('svg[data-plate]'));
  if (prefersReducedMotion()) return () => {};
  const made: gsap.core.Timeline[] = [];
  for (const svg of svgs) {
    const strokes = svg.querySelectorAll('[data-draw]');
    const fades = svg.querySelectorAll('[data-fade]');
    const scrub = svg.dataset.plate === 'scrub';
    const tl = gsap.timeline({
      scrollTrigger: scrub
        ? { trigger: svg, start: 'top 92%', end: 'bottom 55%', scrub: 1.2 }
        : { trigger: svg, start: 'top 78%', once: true },
    });
    const total = scrub ? 1 : Math.min(4.2, 1.6 + strokes.length * 0.05);
    const each = Math.max(0.9, total * 0.55);
    tl.to(strokes, { strokeDashoffset: 0, duration: each, ease: 'power2.inOut', stagger: { amount: total - each * 0.4 } }, 0);
    if (fades.length) tl.to(fades, { opacity: 1, duration: 1.2, ease: 'power1.out', stagger: { amount: 0.8 } }, scrub ? 0.5 : total * 0.45);
    // drawn to the last line: from here a plate that can move is free to
    if (!scrub) tl.eventCallback('onComplete', () => svg.setAttribute('data-drawn', 'true'));
    made.push(tl);
  }
  return () => made.forEach((t) => {
    t.scrollTrigger?.kill();
    t.kill();
  });
}
