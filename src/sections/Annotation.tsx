import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ANNOTATIONS, PART_ORDER } from '../hero/partsData';
import { getVersion, hero, shownPart, subscribe } from '../hero/store';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV'];
export const romanOf = (i: number) => ROMAN[i] ?? String(i + 1);

/** The leader line and its hand-lettered note. Positions are written straight to the DOM each frame. */
export default function Annotation({ avoid }: { avoid: React.RefObject<HTMLElement> }) {
  useSyncExternalStore(subscribe, getVersion);
  const id = shownPart();
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const halo = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const side = useRef({ id: '', x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = root.current;
      const lab = label.current;
      if (!el || !lab || !line.current || !dot.current) return;
      const show = !!id && hero.anchor.visible && hero.scroll < 0.12;
      el.dataset.on = show ? 'true' : 'false';
      if (!id || !hero.anchor.visible) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const { x: axp, y: ayp } = hero.anchor;
      const lw = lab.offsetWidth;
      const lh = lab.offsetHeight;
      const narrow = W < 760;
      let lx: number;
      let ly: number;
      let d: string;
      if (narrow) {
        lx = 18;
        ly = H - lh - 18;
        d = `M${axp.toFixed(1)} ${ayp.toFixed(1)}L${(lx + 26).toFixed(1)} ${(ly - 4).toFixed(1)}`;
      } else {
        // Two clear places on the page: left, under the title, and right, above the plate caption.
        // The note goes to whichever is nearer the part, and stays there while the stack turns.
        const host = el.getBoundingClientRect();
        const block = avoid.current?.getBoundingClientRect();
        const gutter = block ? block.left - host.left : 72;
        const leftSlot = { x: gutter, y: Math.max((block ? block.bottom - host.top : H * 0.5) + 56, H * 0.57) };
        const rightSlot = { x: W - gutter - 52 - lw, y: H - lh - Math.max(150, H * 0.2) };
        if (side.current.id !== id) {
          const dl = Math.hypot(axp - (leftSlot.x + lw / 2), ayp - (leftSlot.y + lh / 2));
          const dr = Math.hypot(axp - (rightSlot.x + lw / 2), ayp - (rightSlot.y + lh / 2));
          const useLeft = W >= 1180 && leftSlot.y + lh < H - 70 && dl < dr * 0.9;
          side.current = { id, x: useLeft ? 0 : 1, y: 0 };
        }
        const left = side.current.x === 0;
        lx = left ? leftSlot.x : rightSlot.x;
        ly = left ? leftSlot.y : rightSlot.y;
        // the line lands on a short rule beside the first line of lettering
        const fromLeft = axp < lx + lw / 2;
        const ex = fromLeft ? lx - 12 : lx + lw + 12;
        const ey = ly + 24;
        const kx = fromLeft ? ex - 30 : ex + 30;
        d = `M${axp.toFixed(1)} ${ayp.toFixed(1)}L${kx.toFixed(1)} ${ey.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`;
      }
      lab.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
      line.current.setAttribute('d', d);
      halo.current?.setAttribute('d', d);
      dot.current.setAttribute('cx', axp.toFixed(1));
      dot.current.setAttribute('cy', ayp.toFixed(1));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, avoid]);

  const a = id ? ANNOTATIONS[id] : null;
  const index = id ? PART_ORDER.indexOf(id) : -1;

  return (
    <div className="annotation" ref={root} data-on="false" aria-live="polite">
      <svg className="annotation-line" aria-hidden="true">
        <path key={`h-${id}`} ref={halo} className="halo" pathLength={1} />
        <path key={`l-${id}`} ref={line} pathLength={1} />
        <circle key={`d-${id}`} ref={dot} r={3.2} />
      </svg>
      <div className="annotation-label" ref={label}>
        {a && (
          <div key={id} className="annotation-inner">
            <span className="annotation-num">{romanOf(index)}</span>
            <p className="annotation-it">{a.it}</p>
            <p className="annotation-en">{a.en}</p>
            <p className="annotation-note">{a.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
