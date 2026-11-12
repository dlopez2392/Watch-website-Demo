import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-sc/600.css';
import '@fontsource-variable/jost';
import '../styles/global.css';
import { WATCHES } from '../lib/watches';
import { PlateBalance, PlateCase, PlateEscapement, PlateFinish, PlateSection, PlateTrain, PlateWinding } from './plates';

/**
 * Every plate on one sheet, fully drawn: /?plates
 * For checking the drawings against the calibre; `?plates=train` (or escapement, balance, winding,
 * section, finish, codice, lungarno, tirreno, doppiofuso) shows one alone, large.
 */
export default function Gallery() {
  document.documentElement.classList.add('no-motion');
  const only = new URLSearchParams(window.location.search).get('plates');
  const all: [string, React.ReactNode, boolean?][] = [
    ['train', <PlateTrain />],
    ['escapement', <PlateEscapement />],
    ['balance', <PlateBalance />],
    ['winding', <PlateWinding />],
    ['section', <PlateSection />, true],
    ['finish', <PlateFinish />, true],
    ...WATCHES.map((w) => [w.id, <PlateCase spec={w} />, true] as [string, React.ReactNode, boolean]),
  ];
  const shown = only ? all.filter(([id]) => id === only) : all;
  return (
    <main style={{ background: '#ece0c8', minHeight: '100vh', padding: '24px', display: 'grid', gridTemplateColumns: only ? '1fr' : 'repeat(2, 1fr)', gap: '24px' }}>
      {shown.map(([id, node, wide]) => (
        <figure key={id} data-plate-id={id} style={{ margin: 0, gridColumn: wide && !only ? '1 / -1' : undefined, background: '#f1e7d1', border: '1px solid rgba(74,52,35,.25)', padding: '18px' }}>
          {node}
          <figcaption className="label" style={{ marginTop: 8 }}>
            {id}
          </figcaption>
        </figure>
      ))}
    </main>
  );
}
