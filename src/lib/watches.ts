/** The collection. One parametric description drives the 3D model, the drawn plate and the spec table. */

export type WatchId = 'codice' | 'lungarno' | 'tirreno' | 'doppiofuso';

export interface DialSpec {
  style: 'sector' | 'classic' | 'diver' | 'gmt';
  base: string;
  ring: string;
  ink: string;
  accent: string;
  lume?: string;
  model: string;
}

export interface WatchSpec {
  id: WatchId;
  name: string;
  numeral: string;
  ref: string;
  kind: string;
  line: string;
  body: string;
  price: string;
  diameter: number;
  thickness: number;
  lugToLug: number;
  lugWidth: number;
  caseMetal: 'steel' | 'gold';
  bezel: 'smooth' | 'dive' | 'gmt';
  dial: DialSpec;
  hands: 'leaf' | 'sword' | 'baton';
  handMetal: 'blued' | 'gold' | 'steel';
  seconds: 'small' | 'centre' | 'none';
  gmtHand: boolean;
  crownGuards: boolean;
  displayBack: boolean;
  applied: 'none' | 'gold' | 'steel' | 'blued';
  strap: { color: string; stitch: string; label: string };
  specs: [string, string][];
}

export const WATCHES: WatchSpec[] = [
  {
    id: 'codice',
    name: 'Codice 39',
    numeral: 'I',
    ref: 'V39.01',
    kind: 'Dress · hand-wound · small seconds',
    line: 'The drawing, built.',
    body: 'Our first notebook watch. A sector dial ruled like a draughtsman’s chart, leaf hands blued over a flame, and the Calibro V.31 in plain view through the back. Wind it each morning; it asks for thirty turns and nothing else.',
    price: '€ 6,400',
    diameter: 39,
    thickness: 10.5,
    lugToLug: 46.8,
    lugWidth: 20,
    caseMetal: 'steel',
    bezel: 'smooth',
    dial: { style: 'sector', base: '#e6dfcb', ring: '#d1cbb9', ink: '#2b2420', accent: '#a3402a', model: 'CODICE' },
    hands: 'leaf',
    handMetal: 'blued',
    seconds: 'small',
    gmtHand: false,
    crownGuards: false,
    displayBack: true,
    applied: 'blued',
    strap: { color: '#84522f', stitch: '#d9c3a0', label: 'Cognac calf, Santa Croce' },
    specs: [
      ['Case', '316L steel, 39 mm × 10.5 mm'],
      ['Lug to lug', '46.8 mm, 20 mm between lugs'],
      ['Crystal', 'Domed sapphire, coated within'],
      ['Calibre', 'V.31, hand-wound, 19 jewels'],
      ['Frequency', '21,600 A/h (3 Hz)'],
      ['Reserve', '50 hours'],
      ['Water', '5 bar'],
      ['Edition', 'Numbered, 300 a year'],
    ],
  },
  {
    id: 'lungarno',
    name: 'Lungarno 36',
    numeral: 'II',
    ref: 'V36.02',
    kind: 'Dress · hand-wound · two hands',
    line: 'Two hands, nothing to add.',
    body: 'Named for the embankments where the river slows. Yellow gold, an ivory lacquer dial, and no seconds hand to hurry you. At 8.9 mm it sits under a cuff as if it had always been there.',
    price: '€ 14,800',
    diameter: 36,
    thickness: 8.9,
    lugToLug: 43.2,
    lugWidth: 18,
    caseMetal: 'gold',
    bezel: 'smooth',
    dial: { style: 'classic', base: '#f1ead8', ring: '#f1ead8', ink: '#3a2a1c', accent: '#a8843e', model: 'LUNGARNO' },
    hands: 'leaf',
    handMetal: 'gold',
    seconds: 'none',
    gmtHand: false,
    crownGuards: false,
    displayBack: true,
    applied: 'gold',
    strap: { color: '#4a2f1e', stitch: '#8a6a4a', label: 'Sepia calf, hand-burnished' },
    specs: [
      ['Case', '18 ct yellow gold, 36 mm × 8.9 mm'],
      ['Lug to lug', '43.2 mm, 18 mm between lugs'],
      ['Crystal', 'Domed sapphire'],
      ['Calibre', 'V.31/S, hand-wound, 17 jewels'],
      ['Frequency', '21,600 A/h (3 Hz)'],
      ['Reserve', '50 hours'],
      ['Water', '3 bar'],
      ['Edition', 'Numbered, 60 a year'],
    ],
  },
  {
    id: 'tirreno',
    name: 'Tirreno 41',
    numeral: 'III',
    ref: 'V41.03',
    kind: 'Diver · automatic · 300 m',
    line: 'The same hand, in salt water.',
    body: 'First drawn in 1974 for the pilots of the Livorno roads. A sixty-minute bezel that turns one way only, a screw-down crown between two guards, and a dial the colour of the sea at the hour before light.',
    price: '€ 5,900',
    diameter: 41,
    thickness: 12.6,
    lugToLug: 48.5,
    lugWidth: 21,
    caseMetal: 'steel',
    bezel: 'dive',
    dial: { style: 'diver', base: '#121b36', ring: '#1b2a55', ink: '#ece5d1', accent: '#c75a3d', lume: '#e7eedb', model: 'TIRRENO' },
    hands: 'sword',
    handMetal: 'steel',
    seconds: 'centre',
    gmtHand: false,
    crownGuards: true,
    displayBack: false,
    applied: 'none',
    strap: { color: '#141d38', stitch: '#141d38', label: 'Midnight sailcloth, steel pin buckle' },
    specs: [
      ['Case', '316L steel, 41 mm × 12.6 mm'],
      ['Lug to lug', '48.5 mm, 21 mm between lugs'],
      ['Bezel', 'Unidirectional, 120 clicks, ceramic insert'],
      ['Calibre', 'V.40A, automatic, 25 jewels'],
      ['Frequency', '28,800 A/h (4 Hz)'],
      ['Reserve', '60 hours'],
      ['Water', '30 bar (300 m), screw-down crown'],
      ['Edition', 'Open, numbered'],
    ],
  },
  {
    id: 'doppiofuso',
    name: 'Doppio Fuso 40',
    numeral: 'IV',
    ref: 'V40.04',
    kind: 'Travel · hand-wound · second time zone',
    line: 'Home, and wherever you are.',
    body: 'Doppio fuso: two time zones. A fourth hand in red chalk circles the dial once a day against a fixed twenty-four hour ring, so Florence stays in view from anywhere. The dial is the brown-black of iron-gall ink.',
    price: '€ 7,200',
    diameter: 40,
    thickness: 11.2,
    lugToLug: 47.6,
    lugWidth: 20,
    caseMetal: 'steel',
    bezel: 'gmt',
    dial: { style: 'gmt', base: '#2a2420', ring: '#332b25', ink: '#e8dcc0', accent: '#c75a3d', lume: '#e8dcc0', model: 'DOPPIO FUSO' },
    hands: 'baton',
    handMetal: 'steel',
    seconds: 'centre',
    gmtHand: true,
    crownGuards: false,
    displayBack: true,
    applied: 'steel',
    strap: { color: '#7d3423', stitch: '#b98a6a', label: 'Chestnut calf, saddle-stitched' },
    specs: [
      ['Case', '316L steel, 40 mm × 11.2 mm'],
      ['Lug to lug', '47.6 mm, 20 mm between lugs'],
      ['Bezel', 'Fixed, engraved 24 hours'],
      ['Calibre', 'V.31/F, hand-wound, 23 jewels'],
      ['Frequency', '21,600 A/h (3 Hz)'],
      ['Reserve', '48 hours'],
      ['Water', '10 bar'],
      ['Edition', 'Numbered, 200 a year'],
    ],
  },
];

export const watchById = (id: WatchId) => WATCHES.find((w) => w.id === id)!;
