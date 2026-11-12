import { useEffect, useState } from 'react';
import { computeLayout } from '../hero/layout';

/**
 * What is drawn on the page under the watch: the plan of the Codice 39 with its
 * compass-and-ruler construction. The 3D watch starts life lying exactly on this drawing.
 */
export default function PageDrawing() {
  const [box, setBox] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const L = computeLayout(box.w, box.h);
  const cx = box.w / 2 + L.flat[0] * L.ppu;
  const cy = box.h / 2 - L.flat[1] * L.ppu;
  const u = L.ppu * L.flatScale; // pixels per millimetre of watch
  const R = 19.5 * u;
  const phi = 1.618;
  const ax = Math.cos(L.psi);
  const ay = -Math.sin(L.psi);
  const far = Math.hypot(box.w, box.h);
  const ticks = Array.from({ length: 41 }, (_, i) => (i - 20) * 9 * u);
  let n = 0;
  const d = () => ({ 'data-draw': '', pathLength: 1, style: { ['--n' as string]: n++ } });

  return (
    <div className="page-drawing" aria-hidden="true">
      <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`}>
        <g transform={`translate(${cx} ${cy})`}>
          {/* ruler lines through the centre */}
          <line className="c" x1={-far} y1={0} x2={far} y2={0} {...d()} />
          <line className="c" x1={0} y1={-far} x2={0} y2={far} {...d()} />
          {/* the axis the watch will open along */}
          <line className="c axis" x1={-ax * far} y1={-ay * far} x2={ax * far} y2={ay * far} {...d()} />
          {ticks.map((t, i) => (
            <line
              key={i}
              className="c"
              x1={ax * t - ay * (i % 5 === 0 ? 7 : 3.5)}
              y1={ay * t + ax * (i % 5 === 0 ? 7 : 3.5)}
              x2={ax * t + ay * (i % 5 === 0 ? 7 : 3.5)}
              y2={ay * t - ax * (i % 5 === 0 ? 7 : 3.5)}
              data-tick=""
            />
          ))}
          {/* proportion: circle, square, and the circle about the square */}
          <circle className="c" r={R * phi} {...d()} />
          <circle className="c" r={R * phi * phi} {...d()} />
          <rect className="c" x={-R * phi} y={-R * phi} width={R * phi * 2} height={R * phi * 2} {...d()} />
          <line className="c" x1={-R * phi} y1={-R * phi} x2={R * phi} y2={R * phi} {...d()} />
          <line className="c" x1={R * phi} y1={-R * phi} x2={-R * phi} y2={R * phi} {...d()} />
          <circle className="c" r={R * phi * Math.SQRT2} {...d()} />
          {/* the plan itself */}
          <circle className="i" r={R} {...d()} />
          <circle className="i" r={16.75 * u} {...d()} />
          <circle className="i" r={11.35 * u} {...d()} />
          <circle className="i" cx={0} cy={8.6 * u} r={4.3 * u} {...d()} />
          {[1, -1].map((sx) =>
            [1, -1].map((sy) => (
              <path
                key={`${sx}${sy}`}
                className="i"
                d={`M${sx * 10 * u} ${sy * 16.7 * u}L${sx * 10 * u} ${sy * 23.6 * u}L${sx * 12.7 * u} ${sy * 23.6 * u}L${sx * 12.7 * u} ${sy * 14.8 * u}`}
                {...d()}
              />
            )),
          )}
          <rect className="i" x={20.1 * u} y={-2.9 * u} width={3.2 * u} height={5.8 * u} {...d()} />
          {/* a dimension, as a draughtsman would leave it */}
          <g className="dim">
            <line className="s" x1={-R} y1={-R * 1.36} x2={R} y2={-R * 1.36} {...d()} />
            <line className="s" x1={-R} y1={-R * 1.36 - 6} x2={-R} y2={-R * 1.36 + 6} {...d()} />
            <line className="s" x1={R} y1={-R * 1.36 - 6} x2={R} y2={-R * 1.36 + 6} {...d()} />
            <line className="c" x1={-R} y1={-R * 1.36} x2={-R} y2={-R * 0.3} {...d()} />
            <line className="c" x1={R} y1={-R * 1.36} x2={R} y2={-R * 0.3} {...d()} />
            <text x={0} y={-R * 1.36 - 10} textAnchor="middle" data-note="">
              ∅ 39
            </text>
          </g>
        </g>
      </svg>
      <p className="note note-a hand" style={{ left: cx - R * 0.98, top: cy - R * 1.68 }}>
        pianta, scala 1 : 1
      </p>
      <p className="note note-b hand" style={{ left: cx + R * 1.5, top: cy - R * 1.95 }}>
        <span className="mirror">prima il disegno, poi l’acciaio</span>
      </p>
    </div>
  );
}
