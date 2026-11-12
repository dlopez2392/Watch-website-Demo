import type { ReactNode } from 'react';
import { CALIBRE_FACTS, JEWEL_COUNT } from '../lib/calibre';
import { PlateBalance, PlateEscapement, PlateSection, PlateTrain, PlateWinding } from '../plates/plates';
import { Pic } from './Media';

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
      ['a', 'Bariletto', '80 teeth on a pinion of 10: one turn in eight hours'],
      ['b', 'Ruota di centro', '64 teeth, one turn an hour'],
      ['c', 'Ruota mediana', '60 teeth, one turn in seven and a half minutes'],
      ['d', 'Ruota dei secondi', '72 teeth, one turn a minute'],
      ['e', 'Ruota di scappamento', '15 teeth, steel, twelve turns a minute'],
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
      ['a', 'Ruota di scappamento', 'club-toothed, 4.84 mm, 15 teeth'],
      ['b', 'Àncora', 'the lever, swinging 15° between two banking pins'],
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
    body: `Turn the crown and the ratchet takes up ${CALIBRE_FACTS.mainspring} millimetres of spring inside the barrel. Thirty turns from empty are six and a quarter of the barrel, and fifty hours of running. A click of steel keeps what you have given.`,
    keys: [
      ['a', 'Bariletto', 'with its mainspring'],
      ['b', 'Rocchetto', 'the ratchet wheel, 48 teeth'],
      ['c', 'Ruota a corona', 'the crown wheel, 32 teeth'],
      ['d', 'Corona', 'its stem, and a winding pinion of 10'],
      ['e', 'Cricco', 'the click'],
    ],
    art: <PlateWinding />,
    note: 'trenta giri, ogni mattina',
    wide: true,
  },
];

export default function Movimento() {
  return (
    <section className="movimento" id="movimento" aria-labelledby="movimento-h">
      <div className="band" data-tone="dark">
        <Pic className="band-img" name="notebook-spread" sizes="100vw" alt="An open notebook on a walnut desk, its parchment pages filled with ink and red-chalk drawings of a watch movement, a brass compass resting on the page." />
        <div className="band-shade" aria-hidden="true" />
        <div className="wrap band-copy">
          <p className="kicker" data-reveal>
            <span className="numeral">III</span>
            <span className="label">Il Movimento</span>
          </p>
          <h2 className="display" id="movimento-h" data-reveal style={{ ['--i' as string]: 1 }}>
            One hundred and forty-two parts, <em>one sheet of paper.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            The {CALIBRE_FACTS.name} is drawn in Florence before a single part is cut. These are the plates we work from.
          </p>
        </div>
      </div>
      <div className="wrap section movimento-body">
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

        <figure className="calibre">
          <div className="calibre-print" data-reveal>
            <Pic
              name="calibro"
              sizes="(max-width: 900px) 92vw, 46vw"
              alt="Photograph of the Calibro V.31 from the bridge side, in its steel case: gilt bridges with broad stripes, rubies in gold chatons, blued screws, the balance under its cock, and the engraving CAL. V.31, 19 RUBINI, N° 001, VALDARNO FIRENZE."
            />
            <p className="hand calibre-cap">il calibro, dal vero</p>
          </div>
          <figcaption className="calibre-text">
            <p className="numeral" data-reveal>
              V.31
            </p>
            <h3 className="plate-title" data-reveal style={{ ['--i' as string]: 1 }}>
              Il calibro
            </h3>
            <p className="plate-en sc" data-reveal style={{ ['--i' as string]: 1 }}>
              The drawing, in gilt brass and steel
            </p>
            <p className="body" data-reveal style={{ ['--i' as string]: 2 }}>
              Turn the watch over and the sheet is there in metal. Nothing on this side is needed to keep time; all of it is needed to call the work finished.
            </p>
            <ul className="plate-keys" data-reveal style={{ ['--i' as string]: 3 }}>
              <li>
                <span className="k sc">a</span>
                <span className="it">Ponti</span>
                <span className="en">gilt, striped by hand, every edge bevelled and polished</span>
              </li>
              <li>
                <span className="k sc">b</span>
                <span className="it">Rubini</span>
                <span className="en">nineteen, those of the train set in gold chatons</span>
              </li>
              <li>
                <span className="k sc">c</span>
                <span className="it">Viti</span>
                <span className="en">blued over a flame, each seated in a polished sink</span>
              </li>
              <li>
                <span className="k sc">d</span>
                <span className="it">Rocchetto</span>
                <span className="en">the winding wheels, finished with a sunray</span>
              </li>
            </ul>
          </figcaption>
        </figure>

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
          <div className="plate-scroll" tabIndex={0} role="group" aria-label="Developed section of the calibre; slide to read it">
            <PlateSection />
          </div>
          <figcaption id="sezione-cap">
            <span className="label">Tav. VI</span>
            <span className="hand">sezione sviluppata del treno, scala 4 : 1</span>
          </figcaption>
          <div className="jewels" data-reveal>
            <p className="jewels-head">
              <span className="jewels-total">{CALIBRE_FACTS.jewels}</span>
              <span className="label">Rubini, one by one</span>
            </p>
            <ul>
              {JEWEL_COUNT.map(([it, en, n]) => (
                <li key={it}>
                  <span className="n">{n}</span>
                  <span className="it">{it}</span>
                  <span className="en">{en}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </figure>

      <figure className="interlude wrap">
        <div className="interlude-frame" data-reveal>
          <Pic name="notebook-watch" sizes="(max-width: 900px) 92vw, 70vw" alt="A notebook sheet of watch drawings in ink and red chalk, with a finished steel wristwatch on a cognac strap lying across the page." />
        </div>
        <figcaption data-reveal style={{ ['--i' as string]: 1 }}>
          <p className="hand">prima il disegno,</p>
          <p className="interlude-line">
            then <em>the object.</em>
          </p>
          <p className="body">Every Valdarno begins as a page like this one. The watch is not finished until it can lie on its own drawing and agree with it.</p>
        </figcaption>
      </figure>
    </section>
  );
}
