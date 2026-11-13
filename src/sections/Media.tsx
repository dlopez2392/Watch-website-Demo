import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/env';
import { PIC_SIZES } from './picSizes';
import { isStill, onStill } from '../lib/stillness';

/** A photograph from the generated set, served in two widths. */
export function Pic({ name, alt, sizes = '100vw', className, eager = false }: { name: string; alt: string; sizes?: string; className?: string; eager?: boolean }) {
  // the true widths, so the browser picks the smaller copy whenever it will do, and the box is reserved before it loads
  const [w, h, small] = PIC_SIZES[name] ?? [1800, 1200, 900];
  return (
    <img
      className={className}
      src={`/img/hf/${name}.webp`}
      srcSet={small ? `/img/hf/${name}-900.webp ${small}w, /img/hf/${name}.webp ${w}w` : undefined}
      width={w}
      height={h}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

/** A silent film loop that plays only while it is on screen, and not at all for visitors who ask for less motion. */
export function Loop({ name, label, className, videoRef }: { name: string; label: string; className?: string; videoRef?: React.RefObject<HTMLVideoElement> }) {
  const own = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? own;
  useEffect(() => {
    const v = ref.current;
    if (!v || prefersReducedMotion()) return;
    let seen = false;
    const sync = () => {
      if (seen && !isStill()) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    const off = onStill(sync);
    return () => {
      io.disconnect();
      off();
    };
  }, [ref]);
  return (
    <video ref={ref} className={className} muted loop playsInline preload="none" poster={`/video/${name}-poster.webp`} aria-label={label}>
      <source src={`/video/${name}.webm`} type="video/webm" />
      <source src={`/video/${name}.mp4`} type="video/mp4" />
    </video>
  );
}
