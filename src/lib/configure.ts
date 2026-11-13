/**
 * Su misura: what a client may choose for each watch, and what it costs. Deliberately short. Every
 * option is a combination the house would actually make, and each one resolves to a full WatchSpec,
 * so the configurator shows the same parametric watch as the hero and the collection.
 */
import { WATCHES, watchById, type DialSpec, type WatchId, type WatchSpec } from './watches';

export interface Choice {
  id: string;
  /** the house name, in Italian */
  it: string;
  /** what it is, in English */
  en: string;
  price: number;
  /** extra weeks at the bench */
  weeks?: number;
  /** one character for the order reference */
  code: string;
}

export interface CaseChoice extends Choice {
  metal: WatchSpec['caseMetal'];
}
export interface DialChoice extends Choice {
  dial: Partial<DialSpec>;
}
export interface HandChoice extends Choice {
  metal: WatchSpec['handMetal'];
}
export interface StrapChoice extends Choice {
  color: string;
  stitch: string;
  cloth?: boolean;
}

const STEEL: CaseChoice = { id: 'acciaio', it: 'Acciaio', en: '316L steel, polished and satin', price: 0, code: 'S', metal: 'steel' };
const gold = (price: number): CaseChoice => ({ id: 'oro', it: 'Oro giallo', en: '18 ct yellow gold, cast in Valenza', price, weeks: 4, code: 'G', metal: 'gold' });

const BLUED = (price: number): HandChoice => ({ id: 'azzurrate', it: 'Azzurrate', en: 'Steel blued over a spirit flame', price, code: 'B', metal: 'blued' });
const POLISHED = (price: number): HandChoice => ({ id: 'lucidate', it: 'Lucidate', en: 'Polished steel', price, code: 'P', metal: 'steel' });
const GILT = (price: number): HandChoice => ({ id: 'oro', it: 'Oro', en: 'Polished yellow gold', price, code: 'G', metal: 'gold' });

export const CHOICES: Record<WatchId, { cases: CaseChoice[]; dials: DialChoice[]; hands: HandChoice[] }> = {
  codice: {
    cases: [STEEL, gold(9600)],
    dials: [
      { id: 'avorio', it: 'Avorio', en: 'Ivory, ruled in sectors', price: 0, code: '1', dial: {} },
      { id: 'pietra', it: 'Pietra serena', en: 'The grey of Florentine sandstone', price: 0, code: '2', dial: { base: '#b9bbb3', ring: '#a6a9a2', ink: '#20282c', accent: '#a3402a' } },
      { id: 'notte', it: 'Notte', en: 'Midnight, printed in ivory', price: 450, weeks: 1, code: '3', dial: { base: '#18213f', ring: '#212c52', ink: '#e6dfcb', accent: '#d47a5c' } },
    ],
    hands: [BLUED(0), POLISHED(0), GILT(380)],
  },
  lungarno: {
    cases: [gold(0)],
    dials: [
      { id: 'avorio', it: 'Lacca avorio', en: 'Ivory lacquer', price: 0, code: '1', dial: {} },
      { id: 'salmone', it: 'Lacca salmone', en: 'Salmon lacquer, eleven coats', price: 900, weeks: 2, code: '2', dial: { base: '#e6bfa1', ring: '#e6bfa1', ink: '#3a2418', accent: '#8a5a2a' } },
      { id: 'ardesia', it: 'Lacca ardesia', en: 'Slate lacquer, eleven coats', price: 900, weeks: 2, code: '3', dial: { base: '#3a3c40', ring: '#3a3c40', ink: '#efe6cf', accent: '#cdb07a' } },
    ],
    hands: [GILT(0), BLUED(250)],
  },
  tirreno: {
    cases: [STEEL],
    dials: [
      { id: 'notte', it: 'Notte', en: 'The sea an hour before light', price: 0, code: '1', dial: {} },
      { id: 'nero', it: 'Nero', en: 'Black, with a black insert', price: 0, code: '2', dial: { base: '#101114', ring: '#1b1c21', insert: '#131418' } },
      { id: 'verde', it: 'Verde Tirreno', en: 'Deep green, as off Capraia', price: 0, code: '3', dial: { base: '#0f2a28', ring: '#163d37', insert: '#123631' } },
    ],
    hands: [{ ...POLISHED(0), en: 'Polished steel, filled with lume' }],
  },
  doppiofuso: {
    cases: [STEEL, gold(10400)],
    dials: [
      { id: 'ferrogallico', it: 'Ferrogallico', en: 'The brown-black of iron-gall ink', price: 0, code: '1', dial: {} },
      { id: 'pergamena', it: 'Pergamena', en: 'Parchment, printed in sepia', price: 0, code: '2', dial: { base: '#e5d8ba', ring: '#dacba8', ink: '#2a2420', accent: '#a3402a', lume: '#3a2c22' } },
      { id: 'oltrarno', it: 'Blu Oltrarno', en: 'Evening blue over the south bank', price: 450, weeks: 1, code: '3', dial: { base: '#1a2745', ring: '#22325a' } },
    ],
    hands: [POLISHED(0), BLUED(250)],
  },
};

export const STRAPS: StrapChoice[] = [
  { id: 'cognac', it: 'Vitello cognac', en: 'Cognac calf, Santa Croce', price: 0, code: 'C', color: '#84522f', stitch: '#d9c3a0' },
  { id: 'seppia', it: 'Vitello seppia', en: 'Sepia calf, hand-burnished', price: 0, code: 'S', color: '#4a2f1e', stitch: '#8a6a4a' },
  { id: 'castagna', it: 'Vitello castagna', en: 'Chestnut calf, saddle-stitched', price: 0, code: 'K', color: '#7d3423', stitch: '#b98a6a' },
  { id: 'ardesia', it: 'Vitello ardesia', en: 'Slate calf, grey stitching', price: 0, code: 'A', color: '#3d4045', stitch: '#a9a39a' },
  { id: 'vela-notte', it: 'Tela vela notte', en: 'Midnight sailcloth, Livorno', price: 0, code: 'N', color: '#141d38', stitch: '#141d38', cloth: true },
  { id: 'vela-oliva', it: 'Tela vela oliva', en: 'Olive sailcloth, Livorno', price: 0, code: 'V', color: '#3b412f', stitch: '#3b412f', cloth: true },
];

const HOUSE_STRAP: Record<WatchId, string> = { codice: 'cognac', lungarno: 'seppia', tirreno: 'vela-notte', doppiofuso: 'castagna' };

export const ENGRAVING = { price: 180, max: 14 };
export const BASE_WEEKS = 14;

export interface Config {
  id: WatchId;
  metal: string;
  dial: string;
  hands: string;
  strap: string;
  engraving: string;
}

export function defaults(id: WatchId): Config {
  const c = CHOICES[id];
  return { id, metal: c.cases[0].id, dial: c.dials[0].id, hands: c.hands[0].id, strap: HOUSE_STRAP[id], engraving: '' };
}

/** Move to another watch, keeping whatever still applies. */
export function switchTo(c: Config, id: WatchId): Config {
  const d = defaults(id);
  const k = CHOICES[id];
  const keep = <T extends Choice>(list: T[], v: string, fallback: string) => (list.some((o) => o.id === v) ? v : fallback);
  return {
    id,
    metal: keep(k.cases, c.metal, d.metal),
    dial: d.dial,
    hands: d.hands,
    strap: c.strap === HOUSE_STRAP[c.id] ? d.strap : c.strap,
    engraving: c.engraving,
  };
}

/** Engravers cut letters, figures and a little punctuation, nothing else. */
export const cleanEngraving = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9ÀÈÉÌÒÙ .&'·\-/]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, ENGRAVING.max);

export interface Resolved {
  base: WatchSpec;
  metal: CaseChoice;
  dial: DialChoice;
  hands: HandChoice;
  strap: StrapChoice;
  engraving: string;
}

export function resolve(c: Config): Resolved {
  const base = watchById(c.id);
  const k = CHOICES[c.id];
  const pick = <T extends Choice>(list: T[], v: string) => list.find((o) => o.id === v) ?? list[0];
  return {
    base,
    metal: pick(k.cases, c.metal),
    dial: pick(k.dials, c.dial),
    hands: pick(k.hands, c.hands),
    strap: pick(STRAPS, c.strap),
    engraving: cleanEngraving(c.engraving).trim(),
  };
}

/** The configured watch, as a full description the model can be built from. */
export function toSpec(r: Resolved): WatchSpec {
  const { base } = r;
  return {
    ...base,
    caseMetal: r.metal.metal,
    dial: { ...base.dial, ...r.dial.dial },
    handMetal: r.hands.metal,
    // the applied indexes are cut from the same metal as the hands
    applied: base.applied === 'none' ? 'none' : r.hands.metal,
    strap: { color: r.strap.color, stitch: r.strap.stitch, label: r.strap.en, cloth: !!r.strap.cloth },
    engraving: r.engraving || undefined,
  };
}

const basePrice = (s: WatchSpec) => Number(s.price.replace(/[^0-9]/g, ''));
export const euro = (n: number) => `€ ${n.toLocaleString('en-GB')}`;

export interface Bill {
  base: number;
  lines: { what: string; price: number }[];
  total: number;
  weeks: number;
}

export function bill(r: Resolved): Bill {
  const base = basePrice(r.base);
  const lines: Bill['lines'] = [];
  const add = (what: string, o: Choice) => {
    if (o.price) lines.push({ what, price: o.price });
  };
  add(`Case in ${r.metal.en.split(',')[0].toLowerCase()}`, r.metal);
  add(`${r.dial.it} dial`, r.dial);
  add(`Hands in ${r.hands.en.toLowerCase()}`, r.hands);
  add(`${r.strap.it} strap`, r.strap);
  if (r.engraving) lines.push({ what: 'Engraving by hand', price: ENGRAVING.price });
  const weeks = BASE_WEEKS + [r.metal, r.dial, r.hands, r.strap].reduce((a, o) => a + (o.weeks ?? 0), 0);
  return { base, lines, total: base + lines.reduce((a, l) => a + l.price, 0), weeks };
}

/** The reference a workshop ticket would carry: V39.01 / G3B · C, with E for an engraving. */
export function reference(r: Resolved): string {
  return `${r.base.ref} / ${r.metal.code}${r.dial.code}${r.hands.code} · ${r.strap.code}${r.engraving ? ' · E' : ''}`;
}

export function encode(c: Config): string {
  return [c.id, c.metal, c.dial, c.hands, c.strap, cleanEngraving(c.engraving).trim()].join('~');
}

export function decode(s: string | null): Config | null {
  if (!s) return null;
  const [id, metal, dial, hands, strap, engraving = ''] = s.split('~');
  if (!WATCHES.some((w) => w.id === id)) return null;
  const r = resolve({ id: id as WatchId, metal, dial, hands, strap, engraving });
  return { id: id as WatchId, metal: r.metal.id, dial: r.dial.id, hands: r.hands.id, strap: r.strap.id, engraving: r.engraving };
}
