/** Part names and their hand-lettered notes. Kept free of Three.js so the page can read them without loading the hero. */

export type PartId =
  | 'crystal'
  | 'bezel'
  | 'hands'
  | 'secondsHand'
  | 'dial'
  | 'mainplate'
  | 'barrel'
  | 'centreWheel'
  | 'thirdWheel'
  | 'fourthWheel'
  | 'escapeWheel'
  | 'palletFork'
  | 'balance'
  | 'hairspring'
  | 'balanceCock'
  | 'bridges'
  | 'keyless'
  | 'jewels'
  | 'screws'
  | 'crown'
  | 'caseMiddle'
  | 'caseback'
  | 'strap'
  | 'buckle';

export interface Annotation {
  it: string;
  en: string;
  note: string;
}

/** Stack order, top to bottom, with the hand-lettered notes. */
export const PART_ORDER: PartId[] = [
  'crystal',
  'bezel',
  'hands',
  'secondsHand',
  'dial',
  'mainplate',
  'barrel',
  'centreWheel',
  'thirdWheel',
  'fourthWheel',
  'escapeWheel',
  'palletFork',
  'balance',
  'hairspring',
  'balanceCock',
  'bridges',
  'keyless',
  'jewels',
  'screws',
  'crown',
  'caseMiddle',
  'caseback',
  'strap',
  'buckle',
];

export const ANNOTATIONS: Record<PartId, Annotation> = {
  crystal: { it: 'Vetro zaffiro', en: 'Sapphire crystal', note: 'Domed, and coated on the inside. It bends the light, never the dial.' },
  bezel: { it: 'Lunetta', en: 'Bezel', note: 'A polished ring that holds the crystal under pressure.' },
  hands: { it: 'Lancette', en: 'Hour and minute hands', note: 'Leaf-shaped steel, filed to a ridge and blued over a flame at 290 °C.' },
  secondsHand: { it: 'Piccoli secondi', en: 'Small-seconds hand', note: 'Rides the fourth wheel directly: one turn each minute.' },
  dial: { it: 'Quadrante', en: 'Dial', note: 'Silvered brass, sector-ruled like a draughtsman’s chart; the seconds are sunk.' },
  mainplate: { it: 'Platina', en: 'Mainplate', note: 'Gilt and pearled. Every pivot is located from this one plate.' },
  barrel: { it: 'Bariletto', en: 'Mainspring barrel', note: 'Eighteen and a half turns of spring, 420 mm, store fifty hours of running.' },
  centreWheel: { it: 'Ruota di centro', en: 'Centre wheel', note: 'Turns once an hour and carries the minute hand.' },
  thirdWheel: { it: 'Ruota mediana', en: 'Third wheel', note: 'The intermediary, stepping the hour down towards the minute.' },
  fourthWheel: { it: 'Ruota dei secondi', en: 'Fourth wheel', note: 'One turn a minute. Its arbor is the seconds hand.' },
  escapeWheel: { it: 'Ruota di scappamento', en: 'Escape wheel', note: 'Fifteen teeth let the train go, a sixth of a second at a time.' },
  palletFork: { it: 'Àncora', en: 'Pallet fork', note: 'Two ruby pallets lock and release. This is the tick you hear.' },
  balance: { it: 'Bilanciere', en: 'Balance wheel', note: 'Swings 21,600 times an hour and keeps the whole watch honest.' },
  hairspring: { it: 'Spirale', en: 'Hairspring', note: 'Breathes in and out three times a second.' },
  balanceCock: { it: 'Ponte del bilanciere', en: 'Balance cock', note: 'A single arm over the balance, carrying the regulator.' },
  bridges: { it: 'Ponti', en: 'Bridges', note: 'Gilt, striped by hand, every edge bevelled. They hold the upper pivots true.' },
  keyless: { it: 'Rocchetto', en: 'Ratchet and crown wheels', note: 'They wind the barrel; a click stops the spring running back.' },
  jewels: { it: 'Rubini', en: 'Jewels', note: 'Nineteen rubies, the train’s in gold chatons, wherever steel would wear.' },
  screws: { it: 'Viti azzurrate', en: 'Blued screws', note: 'Heat-blued a tray at a time, until cornflower; each sits in a polished sink.' },
  crown: { it: 'Corona e albero', en: 'Crown and stem', note: 'Thirty turns each morning. Pull once to set.' },
  caseMiddle: { it: 'Carrure', en: 'Case middle', note: 'Steel, 39 mm across: brushed flanks, polished bevels.' },
  caseback: { it: 'Fondello', en: 'Display caseback', note: 'A second sapphire, so the work stays in view.' },
  strap: { it: 'Cinturino', en: 'Strap', note: 'Tuscan calf, cut and stitched in Santa Croce.' },
  buckle: { it: 'Fibbia ad ardiglione', en: 'Pin buckle', note: 'Milled from the same steel as the case.' },
};
