import { useEffect, useRef, useState } from 'react';
import { WATCHES } from '../lib/watches';

interface Errors {
  name?: string;
  email?: string;
}

export default function Enquire() {
  const [watch, setWatch] = useState('codice');
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<string | null>(null);
  const thanks = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      setWatch((e as CustomEvent<string>).detail);
      setSent(null);
    };
    window.addEventListener('valdarno:enquire', on);
    return () => window.removeEventListener('valdarno:enquire', on);
  }, []);

  useEffect(() => {
    if (sent) thanks.current?.focus();
  }, [sent]);

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

  const chosen = WATCHES.find((w) => w.id === watch);

  return (
    <section className="section enquire" id="riserva" aria-labelledby="riserva-h">
      <div className="wrap enquire-grid">
        <header className="enquire-head">
          <p className="kicker" data-reveal>
            <span className="numeral">VI</span>
            <span className="label">Riserva</span>
          </p>
          <h2 className="display" id="riserva-h" data-reveal style={{ ['--i' as string]: 1 }}>
            Reserve, <em>or simply ask.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            Each watch is built to order, in about fourteen weeks. Write to us and one of the people who would make it will answer.
          </p>
          <address className="enquire-address" data-reveal style={{ ['--i' as string]: 3 }}>
            <span className="label">La Bottega</span>
            Via dei Serragli 39r
            <br />
            50124 Firenze
            <br />
            <span className="hand">dal martedì al sabato, su appuntamento</span>
          </address>
        </header>

        {sent ? (
          <div className="enquire-thanks" ref={thanks} tabIndex={-1} role="status">
            <p className="hand">Grazie, {sent}.</p>
            <h3 className="plate-title">Your note is written.</h3>
            <p className="body">
              At a real bottega a letter would now be on its way to Florence{chosen ? `, with the ${chosen.name} at the top of the page` : ''}. Valdarno is a concept, so this one stops here: nothing was sent and nothing was stored.
            </p>
            <button type="button" className="text-link" onClick={() => setSent(null)}>
              Write another
            </button>
          </div>
        ) : (
          <form className="enquire-form" ref={form} onSubmit={submit} noValidate data-reveal style={{ ['--i' as string]: 2 }}>
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
                <select id="f-watch" name="watch" value={watch} onChange={(e) => setWatch(e.target.value)}>
                  {WATCHES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}, {w.price}
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
              <textarea id="f-note" name="note" rows={3} placeholder="Wrist size, an engraving, a date it is needed by." />
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
    </section>
  );
}
