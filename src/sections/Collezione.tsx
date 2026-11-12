import { scrollToId } from '../lib/motion';
import { WATCHES } from '../lib/watches';
import { PlateCase } from '../plates/plates';

const ALT: Record<string, string> = {
  codice: 'Codice 39: steel dress watch with an ivory sector dial, blued leaf hands, small seconds at six, on a cognac calf strap.',
  lungarno: 'Lungarno 36: slim yellow-gold watch with an ivory lacquer dial, gold batons and two gold leaf hands, on a sepia strap.',
  tirreno: 'Tirreno 41: steel dive watch with a midnight-blue dial, luminous markers, sword hands and a sixty-minute rotating bezel.',
  doppiofuso: 'Doppio Fuso 40: steel travel watch with an iron-gall dial, a red twenty-four hour hand and an engraved twenty-four hour bezel.',
};

export default function Collezione() {
  const enquire = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('valdarno:enquire', { detail: id }));
    scrollToId('riserva');
  };
  return (
    <section className="section collezione" id="collezione" aria-labelledby="collezione-h">
      <div className="wrap">
        <header className="section-head">
          <p className="kicker" data-reveal>
            <span className="numeral">III</span>
            <span className="label">La Collezione</span>
          </p>
          <h2 className="display" id="collezione-h" data-reveal style={{ ['--i' as string]: 1 }}>
            Four watches. <em>We make no others.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            Each began as a page in the same notebook, and each is built at a bench on the south bank of the Arno.
          </p>
        </header>

        <div className="watches">
          {WATCHES.map((w, i) => (
            <article className={`watch ${i % 2 ? 'is-flipped' : ''}`} key={w.id} id={`watch-${w.id}`}>
              <div className="watch-stage">
                <div className="watch-plate" aria-hidden="false">
                  <PlateCase spec={w} />
                </div>
                <img
                  className="watch-still"
                  data-reveal
                  src={`/img/${w.id}.webp`}
                  srcSet={`/img/${w.id}-900.webp 900w, /img/${w.id}.webp 1500w`}
                  sizes="(max-width: 900px) 92vw, 46vw"
                  width={1500}
                  height={1700}
                  loading="lazy"
                  decoding="async"
                  alt={ALT[w.id]}
                />
                <p className="watch-numeral" aria-hidden="true">
                  {w.numeral}
                </p>
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
