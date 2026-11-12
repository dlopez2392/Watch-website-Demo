import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/env';

/** A photograph from the generated set, served in two widths. */
export function Pic({ name, alt, sizes = '100vw', className, eager = false }: { name: string; alt: string; sizes?: string; className?: string; eager?: boolean }) {
  return (
    <img
      className={className}
      src={`/img/hf/${name}.webp`}
      srcSet={`/img/hf/${name}-900.webp 900w, /img/hf/${name}.webp 1800w`}
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
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [ref]);
  return (
    <video ref={ref} className={className} muted loop playsInline preload="none" poster={`/video/${name}-poster.webp`} aria-label={label}>
      <source src={`/video/${name}.webm`} type="video/webm" />
      <source src={`/video/${name}.mp4`} type="video/mp4" />
    </video>
  );
}
