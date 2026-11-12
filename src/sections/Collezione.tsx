import { scrollToId } from '../lib/motion';
import { WATCHES } from '../lib/watches';
import { PlateCase } from '../plates/plates';
import { Pic } from './Media';

const ALT: Record<string, string> = {
  codice: 'Photograph of the Codice 39: a steel dress watch with an ivory sector dial, blued leaf hands and applied blued batons, small seconds at six, on a cognac calf strap.',
  lungarno: 'Photograph of the Lungarno 36: a slim yellow-gold watch with an ivory lacquer dial, applied gold batons and two gold leaf hands, on a sepia strap.',
  tirreno: 'Photograph of the Tirreno 41: a steel dive watch with a midnight-blue dial, applied luminous markers, sword hands and a sixty-minute rotating bezel.',
  doppiofuso: 'Photograph of the Doppio Fuso 40: a steel travel watch with an iron-gall dial, a red twenty-four hour hand and an engraved twenty-four hour bezel.',
};

const PHOTO: Record<string, string> = {
  codice: 'Detail of the Codice dial: the sunk seconds dial with its fine concentric rings and blued hand.',
  lungarno: 'Detail of the Lungarno dial: gold leaf hands over ivory lacquer, with the applied gold batons.',
  tirreno: 'Detail of the Tirreno: the knurled bezel, its blue insert and the luminous markers.',
  doppiofuso: 'Detail of the Doppio Fuso: the red-tipped twenty-four hour hand and the engraved bezel.',
};

export default function Collezione() {
  const enquire = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('valdarno:enquire', { detail: id }));
    scrollToId('riserva');
  };
  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToId(`watch-${id}`);
  };
  return (
    <section className="section collezione" id="collezione" aria-labelledby="collezione-h">
      <div className="wrap">
        <header className="section-head">
          <p className="kicker" data-reveal>
            <span className="numeral">II</span>
            <span className="label">La Collezione</span>
          </p>
          <h2 className="display" id="collezione-h" data-reveal style={{ ['--i' as string]: 1 }}>
            Four watches. <em>We make no others.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            Each began as a page in the same notebook, and each is built at a bench on the south bank of the Arno.
          </p>
        </header>

        <nav className="watch-index" aria-label="The four watches">
          {WATCHES.map((w, i) => (
            <a key={w.id} href={`#watch-${w.id}`} onClick={jump(w.id)} data-reveal style={{ ['--i' as string]: i }}>
              <span className="watch-index-img">
                <img src={`/img/${w.id}-900.webp`} width={900} height={1200} alt="" decoding="async" />
              </span>
              <span className="watch-index-text">
                <span className="numeral">{w.numeral}</span>
                <span className="watch-index-name">{w.name}</span>
                <span className="label">{w.price}</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="watches">
          {WATCHES.map((w, i) => (
            <article className={`watch ${i % 2 ? 'is-flipped' : ''}`} key={w.id} id={`watch-${w.id}`}>
              <div className="watch-stage">
                <div className="watch-plate" aria-hidden="false">
                  <PlateCase spec={w} />
                </div>
                <figure className="watch-print" data-reveal>
                  <img
                    src={`/img/${w.id}.webp`}
                    srcSet={`/img/${w.id}-900.webp 900w, /img/${w.id}.webp 1500w`}
                    sizes="(max-width: 900px) 70vw, 30vw"
                    width={1500}
                    height={2000}
                    loading="lazy"
                    decoding="async"
                    alt={ALT[w.id]}
                  />
                  <figcaption className="hand">
                    fot. {w.numeral}, dal vero
                  </figcaption>
                </figure>
                <p className="watch-numeral" aria-hidden="true">
                  {w.numeral}
                </p>
                <figure className="watch-photo" data-reveal style={{ ['--i' as string]: 2 }}>
                  <Pic name={`detail-${w.id}`} sizes="(max-width: 900px) 40vw, 15vw" alt={PHOTO[w.id]} />
                  <figcaption className="hand">particolare</figcaption>
                </figure>
              </div>
              <div className="watch-text">
                <p className="label" data-reveal>
                  {w.kind}
                </p>
                <h3 className="watch-name" data-reveal style={{ ['--i' as string]: 1 }}>
                  {w.name}
                </h3>
                <p className="watch-line" data-reveal style={{ ['--i' as string]: 1 }}>
                  {w.line}
                </p>
                <p className="body" data-reveal style={{ ['--i' as string]: 2 }}>
                  {w.body}
                </p>
                <table className="spec" data-reveal style={{ ['--i' as string]: 3 }}>
                  <caption className="sr-only">{w.name}: specification</caption>
                  <tbody>
                    {w.specs.map(([k, v]) => (
                      <tr key={k}>
                        <th scope="row" className="label">
                          {k}
                        </th>
                        <td>{v}</td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="label">
                        Strap
                      </th>
                      <td>{w.strap.label}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="watch-foot" data-reveal style={{ ['--i' as string]: 4 }}>
                  <p className="watch-price">
                    <span className="label">Ref. {w.ref}</span>
                    {w.price}
                  </p>
                  <a className="text-link" href="#riserva" onClick={enquire(w.id)}>
                    Enquire<span className="sr-only"> about the {w.name}</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
