import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { hasWebGL2 } from '../lib/env';
import { aim, newTurn, type Turn } from '../lib/turn';
import { WATCHES, type WatchId } from '../lib/watches';
import {
  CHOICES,
  ENGRAVING,
  STRAPS,
  bill,
  cleanEngraving,
  encode,
  euro,
  reference,
  resolve,
  switchTo,
  toSpec,
  type Choice,
  type Config,
} from '../lib/configure';

const Turntable = lazy(() => import('./Turntable'));

/* ---------- swatches: what each choice looks like, drawn in CSS ---------- */

const METAL: Record<string, string> = {
  steel: 'linear-gradient(135deg, #f4f4f2 0%, #a2a6aa 42%, #e8e9ea 58%, #7b7f84 100%)',
  gold: 'linear-gradient(135deg, #f7e5ab 0%, #b88a3d 42%, #f2d99c 58%, #87621f 100%)',
  blued: 'linear-gradient(135deg, #8aa6e6 0%, #1d3a8e 42%, #5c7fd2 58%, #12286a 100%)',
};

type Swatch = { kind: 'metal' | 'dial' | 'strap' | 'photo'; style: React.CSSProperties; src?: string };

function Option({
  group,
  value,
  checked,
  onPick,
  it,
  en,
  price,
  swatch,
}: {
  group: string;
  value: string;
  checked: boolean;
  onPick(v: string): void;
  it: string;
  en: string;
  price: string;
  swatch: Swatch;
}) {
  return (
    <label className="cfg-opt" data-kind={swatch.kind}>
      <input className="sr-only" type="radio" name={group} value={value} checked={checked} onChange={() => onPick(value)} />
      <span className="cfg-swatch" style={swatch.style} aria-hidden="true">
        {swatch.src && <img src={swatch.src} alt="" width={300} height={400} loading="lazy" decoding="async" />}
      </span>
      <span className="cfg-opt-text">
        <span className="cfg-opt-it">{it}</span>
        <span className="cfg-opt-en">{en}</span>
      </span>
      <span className="cfg-opt-price">{price}</span>
    </label>
  );
}

const plus = (o: Choice) => (o.price ? `+ ${euro(o.price)}` : 'included');

function Step({ n, it, en, note, children }: { n: string; it: string; en: string; note: string; children: React.ReactNode }) {
  return (
    <fieldset className="cfg-step">
      <legend>
        <span className="numeral">{n}</span>
        <span className="cfg-step-it">{it}</span>
        <span className="label">{en}</span>
      </legend>
      <p className="cfg-note">{note}</p>
      {children}
    </fieldset>
  );
}

/** A choice the house does not offer: said plainly, rather than shown as a single radio button. */
function Fixed({ it, en, swatch }: { it: string; en: string; swatch: Swatch }) {
  return (
    <p className="cfg-opt is-fixed" data-kind={swatch.kind}>
      <span className="cfg-swatch" style={swatch.style} aria-hidden="true" />
      <span className="cfg-opt-text">
        <span className="cfg-opt-it">{it}</span>
        <span className="cfg-opt-en">{en}</span>
      </span>
      <span className="cfg-opt-price">as drawn</span>
    </p>
  );
}

const byWhen = (weeks: number) => {
  const d = new Date(Date.now() + weeks * 7 * 864e5);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

export default function Configurator({ config, onChange, onWrite }: { config: Config; onChange(c: Config): void; onWrite(): void }) {
  const r = useMemo(() => resolve(config), [config]);
  const b = useMemo(() => bill(r), [r]);
  const ref = reference(r);
  const k = CHOICES[config.id];

  // the engraving reaches the model once the visitor pauses, not at every letter
  const [cut, setCut] = useState(r.engraving);
  useEffect(() => {
    const t = setTimeout(() => setCut(r.engraving), 380);
    return () => clearTimeout(t);
  }, [r.engraving]);
  const spec = useMemo(() => toSpec({ ...r, engraving: cut }), [r.base, r.metal, r.dial, r.hands, r.strap, cut]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the 3D stage is fetched only as the section comes near */
  const stage = useRef<HTMLDivElement>(null);
  const [can3d] = useState(() => hasWebGL2());
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = stage.current;
    if (!el || !can3d) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [can3d]);

  const turn = useRef<Turn>(newTurn());
  const set = (patch: Partial<Config>, face: 'dial' | 'back' = 'dial') => {
    onChange({ ...config, ...patch });
    aim(turn.current, face === 'back' ? Math.PI : 0);
  };
  const pickWatch = (id: string) => {
    onChange(switchTo(config, id as WatchId));
    aim(turn.current, 0);
  };

  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const link = () => `${window.location.origin}${window.location.pathname}?c=${encodeURIComponent(encode(config))}#riserva`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
  };
  useEffect(() => setCopied('no'), [config]);

  const metal = (m: string): Swatch => ({ kind: 'metal', style: { background: METAL[m] } });
  const hasEngraving = r.engraving.length > 0;

  return (
    <div className="cfg" id="su-misura" role="group" aria-labelledby="cfg-h">
      <div className="cfg-stage" ref={stage}>
        <div className="cfg-frame">
          {WATCHES.map((w) => (
            <img
              key={w.id}
              className="cfg-photo"
              src={`/img/${w.id}-900.webp`}
              width={900}
              height={1200}
              alt=""
              loading="lazy"
              decoding="async"
              data-on={w.id === config.id && !(can3d && ready)}
            />
          ))}
          {can3d && armed && (
            <Suspense fallback={null}>
              <Turntable
                className="cfg-turntable"
                spec={spec}
                movement={config.id === 'codice'}
                strap
                fit={0.48}
                lift={0.03}
                turn={turn}
                label={`Your ${r.base.name}: ${r.metal.en.split(',')[0]} case, ${r.dial.it} dial, ${r.hands.it.toLowerCase()} hands, ${r.strap.en.toLowerCase()}${hasEngraving ? `, engraved ${r.engraving}` : ''}`}
                onReady={() => setReady(true)}
              />
            </Suspense>
          )}
          <p className="cfg-caption" aria-hidden="true">
            <span className="hand">{r.base.name}</span>
            <span className="label">{ref}</span>
          </p>
          <p className="cfg-hint label" aria-hidden="true">
            {can3d ? (ready ? 'Drag to turn' : 'Drawing the watch…') : 'The photograph shows the house version'}
          </p>
          {can3d && (
            <div className="cfg-views">
              <button type="button" className="label" onClick={() => aim(turn.current, 0)} disabled={!ready}>
                Dial
              </button>
              <button type="button" className="label" onClick={() => aim(turn.current, Math.PI)} disabled={!ready}>
                Back
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="cfg-side">
        <header className="cfg-head">
          <p className="label">Su misura</p>
          <h3 className="plate-title" id="cfg-h">
            Choose it at the bench.
          </h3>
          <p className="cfg-lede">
            Every Valdarno is made to order, so a few things are yours to decide. The list is short on purpose: these are the only combinations we would sign.
          </p>
        </header>

        <Step n="i" it="Modello" en="Model" note="Four watches. Change your mind freely; what still applies is kept.">
          <div className="cfg-opts is-models">
            {WATCHES.map((w) => (
              <Option
                key={w.id}
                group="cfg-model"
                value={w.id}
                checked={config.id === w.id}
                onPick={pickWatch}
                it={w.name}
                en={w.kind.split(' · ')[0]}
                price={`from ${w.price}`}
                swatch={{ kind: 'photo', style: {}, src: `/img/${w.id}-300.webp` }}
              />
            ))}
          </div>
        </Step>

        <Step n="ii" it="Cassa" en="Case" note="Turned and finished in Florence. Gold cases are cast in Valenza and add four weeks.">
          <div className="cfg-opts">
            {k.cases.length > 1 ? (
              k.cases.map((o) => <Option key={o.id} group="cfg-case" value={o.id} checked={r.metal.id === o.id} onPick={(v) => set({ metal: v })} it={o.it} en={o.en} price={plus(o)} swatch={metal(o.metal)} />)
            ) : (
              <Fixed it={k.cases[0].it} en={`${k.cases[0].en}. The ${r.base.name} is made in nothing else.`} swatch={metal(k.cases[0].metal)} />
            )}
          </div>
        </Step>

        <Step n="iii" it="Quadrante" en="Dial" note="Three dials for each watch, each printed by hand in four passes.">
          <div className="cfg-opts">
            {k.dials.map((o) => {
              const d = { ...r.base.dial, ...o.dial };
              return (
                <Option
                  key={o.id}
                  group="cfg-dial"
                  value={o.id}
                  checked={r.dial.id === o.id}
                  onPick={(v) => set({ dial: v })}
                  it={o.it}
                  en={o.en}
                  price={plus(o)}
                  swatch={{ kind: 'dial', style: { ['--a' as string]: d.base, ['--b' as string]: d.ring, ['--c' as string]: d.ink, ['--d' as string]: d.accent } }}
                />
              );
            })}
          </div>
        </Step>

        <Step n="iv" it="Lancette" en="Hands" note="Blued over a spirit flame or polished, never painted. The applied indexes follow the hands.">
          <div className="cfg-opts">
            {k.hands.length > 1 ? (
              k.hands.map((o) => <Option key={o.id} group="cfg-hands" value={o.id} checked={r.hands.id === o.id} onPick={(v) => set({ hands: v })} it={o.it} en={o.en} price={plus(o)} swatch={metal(o.metal)} />)
            ) : (
              <Fixed it={k.hands[0].it} en={`${k.hands[0].en}: the only hands we fit to a diver.`} swatch={metal(k.hands[0].metal)} />
            )}
          </div>
        </Step>

        <Step n="v" it="Cinturino" en="Strap" note="Calf from Santa Croce sull’Arno or sailcloth from Livorno, cut to your wrist.">
          <div className="cfg-opts is-straps">
            {STRAPS.map((o) => (
              <Option
                key={o.id}
                group="cfg-strap"
                value={o.id}
                checked={r.strap.id === o.id}
                onPick={(v) => set({ strap: v })}
                it={o.it}
                en={o.en}
                price={plus(o)}
                swatch={{ kind: 'strap', style: { ['--a' as string]: o.color, ['--b' as string]: o.stitch }, src: undefined }}
              />
            ))}
          </div>
        </Step>

        <fieldset className="cfg-step">
          <legend>
            <span className="numeral">vi</span>
            <span className="cfg-step-it">Incisione</span>
            <span className="label">Engraving</span>
          </legend>
          <p className="cfg-note" id="cfg-engrave-note">
            Initials, a name or a date, cut by hand round the caseback beside our own line. Up to {ENGRAVING.max} characters; {euro(ENGRAVING.price)}.
          </p>
          <div className="field cfg-engrave">
            <label htmlFor="cfg-engraving">
              Your line <span>{hasEngraving ? `${r.engraving.length} of ${ENGRAVING.max}` : 'optional'}</span>
            </label>
            <input
              id="cfg-engraving"
              type="text"
              value={config.engraving}
              maxLength={ENGRAVING.max + 4}
              autoComplete="off"
              spellCheck={false}
              placeholder="D.L. 13.XI.26"
              aria-describedby="cfg-engrave-note"
              onFocus={() => aim(turn.current, Math.PI)}
              onChange={(e) => set({ engraving: cleanEngraving(e.target.value) }, 'back')}
            />
          </div>
        </fieldset>

        <aside className="cfg-sheet" aria-labelledby="cfg-sheet-h">
          <p className="label" id="cfg-sheet-h">
            Scheda d’ordine · order sheet
          </p>
          <p className="cfg-ref">{ref}</p>
          <table className="cfg-bill">
            <caption className="sr-only">Price of the watch as configured</caption>
            <tbody>
              <tr>
                <th scope="row">{r.base.name}, as drawn</th>
                <td>{euro(b.base)}</td>
              </tr>
              {b.lines.map((l) => (
                <tr key={l.what}>
                  <th scope="row">{l.what}</th>
                  <td>+ {euro(l.price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total, with Italian VAT</th>
                <td>
                  <output aria-live="polite">{euro(b.total)}</output>
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="cfg-weeks">
            About {b.weeks} weeks at the bench. Reserved today, it would be on your wrist in <span className="hand">{byWhen(b.weeks + 1)}</span>.
          </p>
          <div className="cfg-actions">
            <button type="button" className="cta" onClick={onWrite}>
              Reserve this watch <span className="arrow" aria-hidden="true" />
            </button>
            <button type="button" className="text-link" onClick={copy}>
              {copied === 'yes' ? 'Link copied' : 'Copy a link to it'}
            </button>
          </div>
          {copied === 'failed' && (
            <p className="cfg-link">
              <label htmlFor="cfg-link-text">This browser would not copy; the link is here to select:</label>
              <input id="cfg-link-text" readOnly value={link()} onFocus={(e) => e.currentTarget.select()} />
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {copied === 'yes' ? 'A link to this configuration was copied.' : ''}
          </p>
        </aside>
      </div>
    </div>
  );
}
