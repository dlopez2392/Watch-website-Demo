import { useEffect, useMemo, useRef, useState } from 'react';
import { WATCHES, type WatchId } from '../lib/watches';
import { bill, decode, defaults, encode, euro, reference, resolve, switchTo, type Config } from '../lib/configure';
import { scrollToId } from '../lib/motion';
import Configurator from './Configurator';

interface Errors {
  name?: string;
  email?: string;
}

const fromUrl = (): Config | null => {
  try {
    return decode(new URLSearchParams(window.location.search).get('c'));
  } catch {
    return null;
  }
};

export default function Enquire() {
  const [config, setConfig] = useState<Config>(() => fromUrl() ?? defaults('codice'));
  const [unsure, setUnsure] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<string | null>(null);
  const thanks = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const touched = useRef(false);

  const change = (c: Config) => {
    touched.current = true;
    setConfig(c);
    setUnsure(false);
    setSent(null);
  };

  // "Reserve" on a watch in the collection starts the configurator from that watch
  useEffect(() => {
    const on = (e: Event) => change(switchTo(config, (e as CustomEvent<WatchId>).detail));
    window.addEventListener('valdarno:enquire', on);
    return () => window.removeEventListener('valdarno:enquire', on);
  });

  // the address bar carries the configuration, so it can be sent to someone or come back to
  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(() => {
      const u = new URL(window.location.href);
      u.searchParams.set('c', encode(config));
      window.history.replaceState(window.history.state, '', u);
    }, 400);
    return () => clearTimeout(t);
  }, [config]);

  useEffect(() => {
    if (sent) thanks.current?.focus();
  }, [sent]);

  const r = useMemo(() => resolve(config), [config]);
  const total = useMemo(() => bill(r).total, [r]);
  const ref = reference(r);

  const write = () => {
    setUnsure(false);
    scrollToId('enquire-grid', -Math.min(140, window.innerHeight * 0.14));
    window.setTimeout(() => document.getElementById('f-name')?.focus({ preventScroll: true }), 50);
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const next: Errors = {};
    if (name.length < 2) next.name = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = 'This does not look like an email address.';
    setErrors(next);
    if (next.name || next.email) {
      const first = form.current?.querySelector<HTMLElement>(next.name ? '#f-name' : '#f-email');
      first?.focus();
      return;
    }
    // Front end only: nothing leaves the page.
    setSent(name.split(/\s+/)[0]);
  };

  return (
    <section className="section enquire" id="riserva" aria-labelledby="riserva-h">
      <div className="wrap">
        <header className="enquire-head">
          <p className="kicker" data-reveal>
            <span className="numeral">VI</span>
            <span className="label">Riserva</span>
          </p>
          <h2 className="display" id="riserva-h" data-reveal style={{ ['--i' as string]: 1 }}>
            Reserve, <em>or simply ask.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            Each watch is built to order, in about fourteen weeks. Choose it here, write to us, and one of the people who would make it will answer.
          </p>
        </header>

        <Configurator config={config} onChange={change} onWrite={write} />

        <div className="enquire-grid" id="enquire-grid">
          <address className="enquire-address" data-reveal>
            <span className="label">La Bottega</span>
            Via dei Serragli 39r
            <br />
            50124 Firenze
            <br />
            <span className="hand">dal martedì al sabato, su appuntamento</span>
          </address>

          <div className="enquire-next" data-reveal>
            <p className="label">What happens next</p>
            <ol>
              <li>Within two working days, the watchmaker who would build it writes back, by name.</li>
              <li>We settle the details together and measure your wrist: at the bench, or by post with a paper gauge.</li>
              <li>A deposit of a third reserves a bench. The rest is due when the watch is finished.</li>
              <li>It is handed over in Via dei Serragli, or sent insured to your door, with its notebook page.</li>
            </ol>
          </div>

          {sent ? (
            <div className="enquire-thanks" ref={thanks} tabIndex={-1} role="status">
              <p className="hand">Grazie, {sent}.</p>
              <h3 className="plate-title">Your note is written.</h3>
              <p className="body">
                At a real bottega a letter would now be on its way to Florence
                {unsure ? '' : `, with the ${r.base.name} (${ref}) at the top of the page`}. Valdarno is a concept, so this one stops here: nothing was sent and nothing was stored.
              </p>
              <button type="button" className="text-link" onClick={() => setSent(null)}>
                Write another
              </button>
            </div>
          ) : (
            <form className="enquire-form" id="enquire-form" ref={form} onSubmit={submit} noValidate data-reveal tabIndex={-1}>
              <div className="enquire-about is-wide">
                <p className="label">Writing about</p>
                {unsure ? (
                  <p className="enquire-about-text">No watch yet. Tell us how you will wear it and we will suggest one.</p>
                ) : (
                  <p className="enquire-about-text">
                    <strong>{r.base.name}</strong>, {r.metal.it.toLowerCase()}, {r.dial.it.toLowerCase()} dial, {r.strap.it.toLowerCase()}
                    {r.engraving ? `, engraved “${r.engraving}”` : ''}
                    <span className="enquire-about-ref">
                      {ref} · {euro(total)}
                    </span>
                  </p>
                )}
                <input type="hidden" name="configuration" value={unsure ? '' : encode(config)} />
              </div>
              <div className="field">
                <label htmlFor="f-name">Name</label>
                <input id="f-name" name="name" type="text" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} />
                {errors.name && (
                  <p className="field-error" id="e-name">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="f-email">Email</label>
                <input id="f-email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'e-email' : undefined} />
                {errors.email && (
                  <p className="field-error" id="e-email">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="f-city">
                  City and country <span>optional</span>
                </label>
                <input id="f-city" name="city" type="text" autoComplete="address-level2" />
              </div>
              <div className="field">
                <label htmlFor="f-watch">Watch</label>
                <div className="select">
                  <select
                    id="f-watch"
                    name="watch"
                    value={unsure ? 'unsure' : config.id}
                    onChange={(e) => (e.target.value === 'unsure' ? setUnsure(true) : change(switchTo(config, e.target.value as WatchId)))}
                  >
                    {WATCHES.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.id === config.id ? ', as configured' : `, from ${w.price}`}
                      </option>
                    ))}
                    <option value="unsure">Not sure yet</option>
                  </select>
                </div>
              </div>
              <div className="field is-wide">
                <label htmlFor="f-note">
                  A note <span>optional</span>
                </label>
                <textarea id="f-note" name="note" rows={3} placeholder="Wrist size, a date it is needed by, a question." />
              </div>
              <div className="enquire-submit is-wide">
                <button type="submit" className="cta">
                  Send the enquiry <span className="arrow" aria-hidden="true" />
                </button>
                <p className="enquire-small">Concept site: the form checks what you write and stops there. Nothing is sent or stored.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
