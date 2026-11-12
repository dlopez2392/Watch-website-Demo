import type { ReactNode } from 'react';
import { CALIBRE_FACTS } from '../lib/calibre';
import { PlateBalance, PlateEscapement, PlateSection, PlateTrain, PlateWinding } from '../plates/plates';

interface PlateEntry {
  tav: string;
  it: string;
  en: string;
  body: string;
  keys: [string, string, string][];
  art: ReactNode;
  wide?: boolean;
  note: string;
  mirror?: boolean;
}

const PLATES: PlateEntry[] = [
  {
    tav: 'Tav. II',
    it: 'Il treno del tempo',
    en: 'The going train',
    body: 'Four wheels divide the force of one spring into hours, minutes and seconds. Sixty-four teeth meet eight; sixty meet eight again. The arithmetic is five centuries old and has never needed correcting.',
    keys: [
      ['a', 'Bariletto', '80 teeth, one turn in eight hours'],
      ['b', 'Ruota di centro', '64 teeth, one turn an hour'],
      ['c', 'Ruota mediana', '60 teeth'],
      ['d', 'Ruota dei secondi', '72 teeth, one turn a minute'],
      ['e', 'Ruota di scappamento', '15 teeth, steel'],
    ],
    art: <PlateTrain />,
    note: 'il tempo, diviso per quattro',
  },
  {
    tav: 'Tav. III',
    it: 'Lo scappamento',
    en: 'The escapement',
    body: 'Here the watch decides what a second is. The fork holds the wheel, lets one tooth pass, and holds it again, six times in every second. Everything upstream of this point is power. This is judgement.',
    keys: [
      ['a', 'Ruota di scappamento', 'club-toothed, 4.8 mm'],
      ['b', 'Àncora', 'the pallet fork'],
      ['c', 'Levée', 'two pallets of synthetic ruby'],
      ['d', 'Disco', 'the roller, with its impulse pin'],
    ],
    art: <PlateEscapement />,
    note: 'sei battiti al secondo',
  },
  {
    tav: 'Tav. IV',
    it: 'Il bilanciere',
    en: 'The balance',
    body: 'A wheel of ten millimetres, poised with fourteen gold screws, swinging 270 degrees each way. Its spring is finer than a hair and is counted, never measured: eleven turns and a half.',
    keys: [
      ['a', 'Bilanciere', 'gilt, 10.0 mm, 3 Hz'],
      ['b', 'Spirale', 'blued, eleven and a half turns'],
      ['c', 'Viti di regolazione', 'fourteen, in gold'],
    ],
    art: <PlateBalance />,
    note: 'le spire si contano, non si misurano',
    mirror: true,
  },
  {
    tav: 'Tav. V',
    it: 'La carica',
    en: 'Winding',
    body: 'Turn the crown and the ratchet takes up 420 millimetres of spring inside the barrel. Thirty turns in the morning buy fifty hours. A click of steel keeps what you have given.',
    keys: [
      ['a', 'Bariletto', 'with its mainspring'],
      ['b', 'Rocchetto', 'the ratchet wheel, 48 teeth'],
      ['c', 'Ruota a corona', 'the crown wheel, 32 teeth'],
      ['d', 'Corona', 'and its stem'],
      ['e', 'Cricco', 'the click'],
    ],
    art: <PlateWinding />,
    note: 'trenta giri, ogni mattina',
    wide: true,
  },
];

export default function Movimento() {
  return (
    <section className="section movimento" id="movimento" aria-labelledby="movimento-h">
      <div className="wrap">
        <header className="section-head">
          <p className="kicker" data-reveal>
            <span className="numeral">II</span>
            <span className="label">Il Movimento</span>
          </p>
          <h2 className="display" id="movimento-h" data-reveal style={{ ['--i' as string]: 1 }}>
            One hundred and forty-two parts, <em>one sheet of paper.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            The {CALIBRE_FACTS.name} is drawn in Florence before a single part is cut. These are the plates we work from.
          </p>
        </header>

        <dl className="facts" data-reveal>
          <div>
            <dt className="label">Diameter</dt>
            <dd>{CALIBRE_FACTS.diameter}</dd>
          </div>
          <div>
            <dt className="label">Height</dt>
            <dd>{CALIBRE_FACTS.height}</dd>
          </div>
          <div>
            <dt className="label">Frequency</dt>
            <dd>{CALIBRE_FACTS.frequency}</dd>
          </div>
          <div>
            <dt className="label">Reserve</dt>
            <dd>{CALIBRE_FACTS.reserve}</dd>
          </div>
          <div>
            <dt className="label">Jewels</dt>
            <dd>{CALIBRE_FACTS.jewels}</dd>
          </div>
        </dl>

        <div className="plates">
          {PLATES.map((p, i) => (
            <article className={`plate ${i % 2 ? 'is-flipped' : ''} ${p.wide ? 'is-wide' : ''}`} key={p.tav}>
              <figure className="plate-art" data-reveal>
                {p.art}
                <figcaption className="label">{p.tav}</figcaption>
                <p className="plate-note hand" aria-hidden="true">
                  {p.mirror ? <span className="mirror">{p.note}</span> : p.note}
                </p>
              </figure>
              <div className="plate-text">
                <p className="numeral" data-reveal>
                  {p.tav}
                </p>
                <h3 className="plate-title" data-reveal style={{ ['--i' as string]: 1 }}>
                  {p.it}
                </h3>
                <p className="plate-en sc" data-reveal style={{ ['--i' as string]: 1 }}>
                  {p.en}
                </p>
                <p className="body" data-reveal style={{ ['--i' as string]: 2 }}>
                  {p.body}
                </p>
                <ul className="plate-keys" data-reveal style={{ ['--i' as string]: 3 }}>
                  {p.keys.map(([k, it, en]) => (
                    <li key={k}>
                      <span className="k sc">{k}</span>
                      <span className="it">{it}</span>
                      <span className="en">{en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>

      <figure className="section-plate" aria-labelledby="sezione-cap">
        <div className="wrap">
          <PlateSection />
          <figcaption id="sezione-cap">
            <span className="label">Tav. VI</span>
            <span className="hand">sezione sviluppata del treno, scala 4 : 1</span>
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
