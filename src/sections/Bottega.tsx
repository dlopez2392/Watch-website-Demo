import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/env';
import { PlateSection } from '../plates/plates';

const BLUING: [number, string, string][] = [
  [200, '#c9b06a', 'paglia'],
  [230, '#b98a3c', 'oro'],
  [255, '#8a4a34', 'bruno'],
  [270, '#6a3a6e', 'porpora'],
  [290, '#27459f', 'fiordaliso'],
  [310, '#5f86c4', 'celeste'],
  [330, '#9aa9b2', 'grigio'],
];

function Perlage() {
  const dots: [number, number][] = [];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 9; i++) dots.push([8 + i * 13 + (j % 2) * 6.5, 8 + j * 11]);
  return (
    <svg className="craft-art" viewBox="0 0 120 72" aria-hidden="true">
      {dots.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={8.6} fill="#131d3a" stroke="#cdbf9f" strokeWidth={0.5} />
          <circle cx={x} cy={y} r={5.6} fill="none" stroke="#cdbf9f" strokeWidth={0.3} opacity={0.7} />
          <circle cx={x} cy={y} r={2.6} fill="none" stroke="#cdbf9f" strokeWidth={0.3} opacity={0.5} />
        </g>
      ))}
    </svg>
  );
}

function Anglage() {
  return (
    <svg className="craft-art" viewBox="0 0 120 72" aria-hidden="true" fill="none" stroke="#cdbf9f" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 52H74L92 34V20H8Z" strokeWidth={0.7} />
      <path d="M74 52 92 34" stroke="#cdb07a" strokeWidth={2.2} />
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d={`M${12 + i * 5} 52 ${12 + i * 5 + 14} 20`} strokeWidth={0.25} opacity={0.5} />
      ))}
      <path d="M98 62 84 46" stroke="#c75a3d" strokeWidth={0.6} />
      <path d="M100 42a16 16 0 0 0-10-14" stroke="#c75a3d" strokeWidth={0.5} />
      <text x={103} y={36} fill="#c75a3d" stroke="none" fontSize={6} fontFamily="var(--sans)">
        45°
      </text>
    </svg>
  );
}

function Bluing() {
  return (
    <div className="craft-art bluing" role="img" aria-label="Tempering colours of steel from 200 to 330 degrees Celsius: straw, gold, brown, purple, cornflower blue at 290 degrees, pale blue, grey.">
      <div className="bluing-bar" style={{ background: `linear-gradient(90deg, ${BLUING.map(([, c]) => c).join(', ')})` }} />
      <ol aria-hidden="true">
        {BLUING.map(([t, , name]) => (
          <li key={t} className={t === 290 ? 'is-target' : ''}>
            <i />
            <span>{t}°</span>
            <em>{name}</em>
          </li>
        ))}
      </ol>
    </div>
  );
}

const CRAFTS = [
  {
    it: 'Smussatura',
    en: 'Anglage',
    body: 'Every bridge has its edge cut back to forty-five degrees with a file, then polished with boxwood and diamond paste until it throws a single line of light.',
    art: <Anglage />,
  },
  {
    it: 'Perlatura',
    en: 'Perlage',
    body: 'The mainplate is grained in overlapping circles, one at a time, with a peg of wood turning under the hand. Nobody will see most of them. That is rather the point.',
    art: <Perlage />,
  },
  {
    it: 'Azzurratura',
    en: 'Bluing',
    body: 'Screws and hands are laid on a brass tray over a spirit flame. At 290 degrees the steel turns the blue of a cornflower, and must come off the heat within a second.',
    art: <Bluing />,
  },
];

export default function Bottega() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    if (prefersReducedMotion()) return;
    // play only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <section className="bottega" id="bottega" data-tone="dark" aria-labelledby="bottega-h">
      <div className="film">
        <video ref={video} muted loop playsInline preload="none" poster="/video/bottega-poster.webp" aria-label="Macro film of the Calibro V.31 running: the balance wheel swinging over the escapement.">
          <source src="/video/bottega.webm" type="video/webm" />
          <source src="/video/bottega.mp4" type="video/mp4" />
        </video>
        <div className="film-shade" aria-hidden="true" />
        <div className="wrap film-copy">
          <p className="kicker" data-reveal>
            <span className="numeral">IV</span>
            <span className="label">La Bottega</span>
          </p>
          <h2 className="display" id="bottega-h" data-reveal style={{ ['--i' as string]: 1 }}>
            Nine benches, <em>one north window.</em>
          </h2>
        </div>
        <div className="wrap film-foot">
          <p className="hand">Calibro V.31, lato ponti. Tre oscillazioni al secondo.</p>
          <button type="button" className="film-toggle label" onClick={toggle} aria-pressed={!playing}>
            <i data-state={playing ? 'pause' : 'play'} aria-hidden="true" />
            {playing ? 'Pause the film' : 'Play the film'}
          </button>
        </div>
      </div>

      <div className="wrap bottega-body">
        <div className="bottega-intro">
          <p className="lede" data-reveal>
            The workshop is in Via dei Serragli, in the Oltrarno, where Florence has kept its trades for six hundred years.
          </p>
          <div className="bottega-cols">
            <p className="body" data-reveal style={{ ['--i' as string]: 1 }}>
              Eleven people work here. Cases are turned and the movement plates are cut two streets away; everything after that happens under the one window that faces north, because north light does not move and does not flatter.
            </p>
            <p className="body" data-reveal style={{ ['--i' as string]: 2 }}>
              A watch spends about fourteen weeks with us. Most of that time is finishing: work done by hand, on surfaces its owner may never look at, to a standard nobody is checking but the person holding the file.
            </p>
          </div>
        </div>

        <ul className="crafts">
          {CRAFTS.map((c, i) => (
            <li key={c.it} data-reveal style={{ ['--i' as string]: i }}>
              {c.art}
              <h3 className="craft-title">{c.it}</h3>
              <p className="label">{c.en}</p>
              <p className="craft-body">{c.body}</p>
            </li>
          ))}
        </ul>

        <dl className="bottega-figures" data-reveal>
          <div>
            <dt className="label">Artigiani</dt>
            <dd>XI</dd>
          </div>
          <div>
            <dt className="label">Banchi</dt>
            <dd>IX</dd>
          </div>
          <div>
            <dt className="label">Weeks at the bench</dt>
            <dd>XIV</dd>
          </div>
          <div>
            <dt className="label">Watches a year</dt>
            <dd>DC</dd>
          </div>
        </dl>
      </div>

      <figure className="bottega-plate" aria-hidden="true">
        <PlateSection dark />
      </figure>
    </section>
  );
}
