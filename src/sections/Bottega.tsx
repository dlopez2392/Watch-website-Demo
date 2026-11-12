import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/env';
import { PlateSection } from '../plates/plates';
import { Loop, Pic } from './Media';

const BLUING: [number, string, string][] = [
  [200, '#c9b06a', 'paglia'],
  [230, '#b98a3c', 'oro'],
  [255, '#8a4a34', 'bruno'],
  [270, '#6a3a6e', 'porpora'],
  [290, '#27459f', 'fiordaliso'],
  [310, '#5f86c4', 'celeste'],
  [330, '#9aa9b2', 'grigio'],
];

function Bluing() {
  return (
    <div className="bluing" role="img" aria-label="Tempering colours of steel from 200 to 330 degrees Celsius: straw, gold, brown, purple, cornflower blue at 290 degrees, pale blue, grey.">
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
    art: <Pic className="craft-art" name="bottega-anglage" sizes="(max-width: 760px) 92vw, 30vw" alt="Fingers polishing the bevelled edge of a watch bridge with a boxwood stick; the bevel catches one bright line of light." />,
  },
  {
    it: 'Perlatura',
    en: 'Perlage and stripes',
    body: 'Plates are grained in overlapping circles, one at a time, and bridges striped in long even passes. Nobody will see most of it. That is rather the point.',
    art: <Loop className="craft-art" name="film-movement" label="Macro film of a finished movement: the balance wheel swinging beside striped bridges, ruby jewels and blued screws." />,
  },
  {
    it: 'Azzurratura',
    en: 'Bluing',
    body: 'Screws and hands are laid on a brass tray over a spirit flame. At 290 degrees the steel turns the blue of a cornflower, and must come off the heat within a second.',
    art: <Loop className="craft-art" name="film-bluing" label="Film of steel screws on a brass tray over a small flame, turning blue." />,
    extra: <Bluing />,
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
        <video ref={video} muted loop playsInline preload="none" poster="/video/film-hands-poster.webp" aria-label="Film at the bench: a watchmaker lowers a wheel into a movement with tweezers, in window light.">
          <source src="/video/film-hands.webm" type="video/webm" />
          <source src="/video/film-hands.mp4" type="video/mp4" />
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
          <p className="hand">Al banco, luce da nord.</p>
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

        <div className="bottega-gallery">
          <figure className="g-room" data-reveal>
            <Pic name="bottega-room" sizes="(max-width: 900px) 92vw, 62vw" alt="The workshop: a row of wooden watchmakers' benches with brass lamps under a tall window, terracotta floor, plaster walls." />
            <figcaption className="label">Via dei Serragli · nine benches</figcaption>
          </figure>
          <figure className="g-maker" data-reveal style={{ ['--i' as string]: 1 }}>
            <Pic name="bottega-watchmaker" sizes="(max-width: 900px) 60vw, 28vw" alt="A watchmaker at the bench, seen from behind the shoulder, hands at work under a brass lamp." />
            <figcaption className="label">North light</figcaption>
          </figure>
        </div>

        <ul className="crafts">
          {CRAFTS.map((c, i) => (
            <li key={c.it} data-reveal style={{ ['--i' as string]: i }}>
              {c.art}
              <h3 className="craft-title">{c.it}</h3>
              <p className="label">{c.en}</p>
              <p className="craft-body">{c.body}</p>
              {c.extra}
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
