import { useEffect, useRef, useState } from 'react';
import { scrollToId } from '../lib/motion';

const LINKS: [string, string, string][] = [
  ['movimento', 'Il Movimento', 'II'],
  ['collezione', 'La Collezione', 'III'],
  ['bottega', 'La Bottega', 'IV'],
  ['storia', 'Storia', 'V'],
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.35);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const darks = Array.from(document.querySelectorAll('[data-tone="dark"]'));
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        setDark(seen.size > 0);
      },
      // a thin band at the height of the nav itself: the tone changes as a section edge passes behind it
      { rootMargin: '-38px 0px -94% 0px' },
    );
    darks.forEach((d) => io.observe(d));
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    window.setTimeout(() => scrollToId(id), open ? 60 : 0);
  };

  return (
    <header className="nav" data-scrolled={scrolled} data-tone={dark && !open ? 'dark' : 'light'} data-open={open}>
      <a className="nav-mark" href="#top" onClick={go('top')} aria-label="Valdarno, back to the top">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="18.2" />
          <circle cx="20" cy="20" r="14.4" />
          <path d="M12.6 12.4 20 28.6l7.4-16.2" />
        </svg>
        <span>Valdarno</span>
      </a>
      <nav className="nav-links" aria-label="Primary">
        <ul>
          {LINKS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} onClick={go(id)}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="nav-reserve" href="#riserva" onClick={go('riserva')}>
        Riserva
      </a>
      <button
        ref={toggle}
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="nav-sheet"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        <i aria-hidden="true" />
        <i aria-hidden="true" />
      </button>
      <div className="nav-sheet" id="nav-sheet" hidden={!open}>
        <ul>
          {LINKS.map(([id, label, num]) => (
            <li key={id}>
              <a href={`#${id}`} onClick={go(id)}>
                <span className="numeral">{num}</span>
                {label}
              </a>
            </li>
          ))}
          <li>
            <a href="#riserva" onClick={go('riserva')}>
              <span className="numeral">VI</span>
              Riserva
            </a>
          </li>
        </ul>
        <p className="hand">Firenze, Oltrarno</p>
      </div>
    </header>
  );
}
