/**
 * Calibro V.31: the single source of truth for the movement's geometry.
 * Everything is in millimetres, seen from the dial side:
 * x runs to 3 o'clock, y to 12 o'clock. Both the WebGL hero and the SVG
 * plates are generated from these numbers, so the drawing and the object agree.
 */

export type P2 = [number, number];

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const polar = (r: number, a: number): P2 => [r * Math.cos(a), r * Math.sin(a)];
export const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
export const len = (a: P2): number => Math.hypot(a[0], a[1]);
export const dist = (a: P2, b: P2): number => len(sub(a, b));
export const angleTo = (a: P2, b: P2): number => Math.atan2(b[1] - a[1], b[0] - a[0]);
export const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** 13¾ lignes: 31.0 mm across */
export const PLATE_R = 15.5;
export const PLATE_T = 1.8;

export interface Gear {
  /** tooth count */
  N: number;
  /** module, mm */
  m: number;
}

export const GEAR = {
  barrel: { N: 80, m: 0.17 },
  centrePinion: { N: 10, m: 0.17 },
  centreWheel: { N: 64, m: 0.16 },
  thirdPinion: { N: 8, m: 0.16 },
  thirdWheel: { N: 60, m: 0.13 },
  fourthPinion: { N: 8, m: 0.13 },
  fourthWheel: { N: 72, m: 0.11 },
  escapePinion: { N: 6, m: 0.11 },
  ratchet: { N: 48, m: 0.2 },
  crownWheel: { N: 32, m: 0.2 },
  hourWheel: { N: 36, m: 0.15 },
  minuteWheel: { N: 24, m: 0.15 },
} satisfies Record<string, Gear>;

export const ESCAPE_TEETH = 15;
export const ESCAPE_R = 2.42;
export const BALANCE_R = 5.0;
export const BEATS_PER_SECOND = 6; // 21,600 A/h, 3 Hz

export const pitchR = (g: Gear) => (g.N * g.m) / 2;
const centreDistance = (a: Gear, b: Gear) => pitchR(a) + pitchR(b);

function circleIntersection(c1: P2, r1: number, c2: P2, r2: number, pick: 1 | -1): P2 {
  const d = dist(c1, c2);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2[0] - c1[0]) / d;
  const uy = (c2[1] - c1[1]) / d;
  return [c1[0] + ux * a - pick * uy * h, c1[1] + uy * a + pick * ux * h];
}

const centre: P2 = [0, 0];
const fourth: P2 = [0, -8.6];
const third = circleIntersection(
  centre,
  centreDistance(GEAR.centreWheel, GEAR.thirdPinion),
  fourth,
  centreDistance(GEAR.thirdWheel, GEAR.fourthPinion),
  1,
);
const escape = add(fourth, polar(centreDistance(GEAR.fourthWheel, GEAR.escapePinion), 160 * DEG));
const balance: P2 = [-9.0, -3.0];
const pallet = lerp2(escape, balance, 3.1 / dist(escape, balance));
const barrel = polar(centreDistance(GEAR.barrel, GEAR.centrePinion), 50 * DEG);
const crownWheelDir = angleTo(barrel, [11.2, 0.9]);
const crownWheel = add(barrel, polar(centreDistance(GEAR.ratchet, GEAR.crownWheel), crownWheelDir));
const minuteWheel = polar(centreDistance(GEAR.hourWheel, GEAR.minuteWheel), 128 * DEG);

/** Pivot positions on the plate. */
export const AX = { centre, third, fourth, escape, pallet, balance, barrel, crownWheel, minuteWheel };

/**
 * Heights, measured from the bridge-side face of the mainplate towards the caseback.
 * `zOf` converts to the watch axis, where the dial-side face of the plate is z = 0
 * and z grows towards the crystal.
 */
export const LV = {
  barrel: [0.15, 1.55] as P2,
  barrelTeeth: [1.2, 1.55] as P2,
  centrePinion: [1.1, 1.62] as P2,
  centreWheel: 1.8,
  thirdPinion: [1.6, 2.0] as P2,
  thirdWheel: 2.25,
  fourthPinion: [2.05, 2.45] as P2,
  fourthWheel: 1.3,
  escapePinion: [1.1, 1.5] as P2,
  escapeWheel: 2.0,
  pallet: 2.0,
  palletBridge: [2.3, 2.56] as P2,
  roller: [1.92, 2.12] as P2,
  balanceRim: [2.85, 3.2] as P2,
  hairspring: [3.28, 3.44] as P2,
  bridge: [2.75, 3.4] as P2,
  cock: [3.6, 4.1] as P2,
  keyless: [3.45, 3.72] as P2,
};
export const zOf = (m: number) => -PLATE_T - m;

export interface OutlineOpts {
  add?: number;
  ded?: number;
  phase?: number;
}

/** Ogival watch-gear outline; a tooth is centred on angle `phase`. */
export function gearOutline(g: Gear, opts: OutlineOpts = {}): P2[] {
  const rp = pitchR(g);
  const ra = rp + g.m * (opts.add ?? 0.95);
  const rr = rp - g.m * (opts.ded ?? 1.25);
  const p = TAU / g.N;
  const ph = opts.phase ?? 0;
  const profile: P2[] = [
    [-0.3, rr],
    [-0.235, rp],
    [-0.14, ra - 0.24 * g.m],
    [-0.05, ra],
    [0.05, ra],
    [0.14, ra - 0.24 * g.m],
    [0.235, rp],
    [0.3, rr],
  ];
  const pts: P2[] = [];
  for (let k = 0; k < g.N; k++) {
    for (const [f, r] of profile) pts.push(polar(r, ph + (k + f) * p));
  }
  return pts;
}

/** Club-tooth escape wheel, leaning into its direction of rotation (anticlockwise from the dial). */
export function escapeOutline(phase = 0): P2[] {
  const p = TAU / ESCAPE_TEETH;
  const root = 1.72;
  const profile: P2[] = [
    [-0.16, root],
    [0.2, 2.3],
    [0.3, ESCAPE_R],
    [0.4, ESCAPE_R - 0.02],
    [0.415, 2.26],
    [0.3, root],
  ];
  const pts: P2[] = [];
  for (let k = 0; k < ESCAPE_TEETH; k++) {
    for (const [f, r] of profile) pts.push(polar(r, phase + (k + f) * p));
  }
  return pts;
}

/** Archimedean spiral, used for the mainspring and the hairspring. */
export function spiral(r0: number, r1: number, turns: number, steps: number, phase = 0): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(polar(r0 + (r1 - r0) * t, phase + t * turns * TAU));
  }
  return pts;
}

/** Length of a spiral, by summing its chords. */
export function spiralLength(r0: number, r1: number, turns: number): number {
  const pts = spiral(r0, r1, turns, Math.ceil(turns * 180));
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** The two springs. The mainspring's turns are chosen so that its length is the 420 mm the watch is specified with. */
export const MAINSPRING = { r0: 1.35, r1: 5.86, turns: 18.5, thick: 0.12 };
export const HAIRSPRING = { r0: 0.58, r1: 3.36, turns: 11.5 };

/**
 * Given gear A (N_a teeth, centre a, rotation phiA) return the rotation of gear B
 * (N_b teeth, centre b) such that a tooth of one meets a gap of the other on the
 * line of centres. Rates follow automatically: dPhiB = -N_a / N_b * dPhiA.
 */
export function meshPhase(phiA: number, Na: number, a: P2, Nb: number, b: P2): number {
  const alpha = angleTo(a, b);
  const tA = ((alpha - phiA) * Na) / TAU;
  return alpha + Math.PI - ((0.5 - tA) * TAU) / Nb;
}

export interface TrainState {
  barrel: number;
  centre: number;
  third: number;
  fourth: number;
  escape: number;
  pallet: number;
  balance: number;
  /** breathing of the hairspring, -1..1 */
  breath: number;
  hour: number;
  minute: number;
  second: number;
}

const easeBeat = (x: number) => {
  // each beat: a quick release, then rest
  const k = Math.min(1, x / 0.28);
  return k * k * (3 - 2 * k);
};

/**
 * The whole going train at wall-clock time `t` (seconds since local midnight).
 * The fourth wheel is the reference: it carries the seconds hand.
 */
export function trainAt(t: number): TrainState {
  const beats = t * BEATS_PER_SECOND;
  const whole = Math.floor(beats);
  const frac = beats - whole;
  const tq = (whole + easeBeat(frac)) / BEATS_PER_SECOND;

  const second = -(tq / 60) * TAU;
  const fourth = second;
  const third = meshPhase(fourth, GEAR.fourthPinion.N, AX.fourth, GEAR.thirdWheel.N, AX.third);
  const centre = meshPhase(third, GEAR.thirdPinion.N, AX.third, GEAR.centreWheel.N, AX.centre);
  const barrel = meshPhase(centre, GEAR.centrePinion.N, AX.centre, GEAR.barrel.N, AX.barrel);
  const escape = meshPhase(fourth, GEAR.fourthWheel.N, AX.fourth, GEAR.escapePinion.N, AX.escape);

  const swing = Math.sin(t * BEATS_PER_SECOND * Math.PI);
  const balance = swing * 270 * DEG;
  const side = whole % 2 === 0 ? 1 : -1;
  const flip = easeBeat(frac);
  const pallet = side * (1 - 2 * flip) * 7.5 * DEG;

  const minute = -((t / 3600) % 1) * TAU;
  const hour = -((t / 43200) % 1) * TAU;
  return { barrel, centre, third, fourth, escape, pallet, balance, breath: swing, hour, minute, second };
}

/* ---------- bridges: plan outlines built from arcs ---------- */

export type Seg =
  | { k: 'M'; p: P2 }
  | { k: 'L'; p: P2 }
  | { k: 'A'; c: P2; r: number; a0: number; a1: number; ccw: boolean };

const BR = PLATE_R - 0.5;
const EDGE = -15 * DEG; // the line between barrel bridge and train bridge
const GAP = 0.22;
const onLine = (offset: number, r: number, dir: number): P2 => {
  // point on the line at perpendicular `offset` from the centre, where it meets radius r
  const along = Math.sqrt(r * r - offset * offset);
  const d = polar(1, dir);
  const n: P2 = [-d[1], d[0]];
  return [d[0] * along + n[0] * offset, d[1] * along + n[1] * offset];
};
const ang = (p: P2) => Math.atan2(p[1], p[0]);

export const BALANCE_CUT_R = BALANCE_R + 0.85;

export function barrelBridgeSegs(): Seg[] {
  const notch = 3.0;
  const a = onLine(GAP, notch, EDGE);
  const b = onLine(GAP, BR, EDGE);
  const top = 118 * DEG;
  const c = onLine(-GAP, BR, top);
  const d = onLine(-GAP, notch, top);
  return [
    { k: 'M', p: a },
    { k: 'L', p: b },
    { k: 'A', c: [0, 0], r: BR, a0: ang(b), a1: ang(c), ccw: true },
    { k: 'L', p: d },
    { k: 'A', c: [0, 0], r: notch, a0: ang(d), a1: ang(a), ccw: false },
  ];
}

export function trainBridgeSegs(): Seg[] {
  const lobe = 2.55;
  const a = onLine(-GAP, lobe, EDGE);
  const b = onLine(-GAP, BR, EDGE);
  const end = -128 * DEG;
  const c = polar(BR, end);
  const cutIn = add(AX.balance, polar(BALANCE_CUT_R, -75 * DEG));
  const cutOut = add(AX.balance, polar(BALANCE_CUT_R, 35 * DEG));
  const lobeIn = polar(lobe, 150 * DEG);
  return [
    { k: 'M', p: a },
    { k: 'L', p: b },
    { k: 'A', c: [0, 0], r: BR, a0: ang(b), a1: end, ccw: false },
    { k: 'L', p: cutIn },
    { k: 'A', c: AX.balance, r: BALANCE_CUT_R, a0: -75 * DEG, a1: 35 * DEG, ccw: true },
    { k: 'L', p: lobeIn },
    { k: 'A', c: [0, 0], r: lobe, a0: 150 * DEG, a1: ang(a), ccw: false },
  ];
}

export const COCK_FOOT: P2 = [-10.6, 6.9];

export function cockSegs(): Seg[] {
  const dir = angleTo(COCK_FOOT, AX.balance);
  const n = dir + Math.PI / 2;
  const wFoot = 2.0;
  const wHead = 1.55;
  const footBack = add(COCK_FOOT, polar(-1.2, dir));
  return [
    { k: 'M', p: add(footBack, polar(wFoot, n)) },
    { k: 'L', p: add(footBack, polar(-wFoot, n)) },
    { k: 'L', p: add(AX.balance, polar(-wHead, n)) },
    { k: 'A', c: AX.balance, r: wHead, a0: n + Math.PI, a1: n + TAU, ccw: true },
  ];
}

export const PALLET_BRIDGE_END: P2 = [-8.9, -7.9];

export function segsToPoints(segs: Seg[], step = 4 * DEG): P2[] {
  const pts: P2[] = [];
  for (const s of segs) {
    if (s.k === 'M' || s.k === 'L') pts.push(s.p);
    else {
      let a1 = s.a1;
      if (s.ccw) while (a1 < s.a0) a1 += TAU;
      else while (a1 > s.a0) a1 -= TAU;
      const n = Math.max(2, Math.ceil(Math.abs(a1 - s.a0) / step));
      for (let i = 0; i <= n; i++) pts.push(add(s.c, polar(s.r, s.a0 + ((a1 - s.a0) * i) / n)));
    }
  }
  return pts;
}

/* ---------- SVG helpers (y is flipped by the plate's own transform) ---------- */

const f = (n: number) => n.toFixed(3);
export const ptsToPath = (pts: P2[], close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + (close ? 'Z' : '');
export const translatePts = (pts: P2[], c: P2): P2[] => pts.map((p) => add(p, c));

/** Positions of the screws that hold the bridges, and of the jewels. */
export const SCREWS: { at: P2; on: 'barrel' | 'train' | 'cock' | 'pallet' | 'ratchet' | 'crown' }[] = [
  { at: polar(12.9, 3 * DEG), on: 'barrel' },
  { at: polar(13.2, 98 * DEG), on: 'barrel' },
  { at: polar(5.2, 96 * DEG), on: 'barrel' },
  { at: polar(13.0, -32 * DEG), on: 'train' },
  { at: polar(13.3, -108 * DEG), on: 'train' },
  { at: polar(5.4, -38 * DEG), on: 'train' },
  { at: COCK_FOOT, on: 'cock' },
  { at: PALLET_BRIDGE_END, on: 'pallet' },
  { at: barrel, on: 'ratchet' },
  { at: crownWheel, on: 'crown' },
];

export const JEWELS: { at: P2; level: number; r: number; chaton: boolean }[] = [
  { at: centre, level: LV.bridge[1], r: 0.62, chaton: true },
  { at: third, level: LV.bridge[1], r: 0.5, chaton: true },
  { at: fourth, level: LV.bridge[1], r: 0.5, chaton: true },
  { at: escape, level: LV.bridge[1], r: 0.42, chaton: true },
  { at: pallet, level: LV.palletBridge[1], r: 0.36, chaton: false },
  { at: balance, level: LV.cock[1], r: 0.55, chaton: true },
];

/** Banking pins: the two stops the lever rests against between beats. */
export const BANKING: P2[] = [1, -1].map((sg) => {
  const rest = angleTo(pallet, balance);
  return add(pallet, polar(2.05, rest + sg * (7.5 * DEG + Math.atan2(0.2 + 0.11, 2.05))));
});

/** Where the nineteen jewels are. */
export const JEWEL_COUNT: [string, string, number][] = [
  ['Bilanciere', 'two hole jewels, two endstones', 4],
  ['Ellisse', 'the impulse pin', 1],
  ['Levée', 'the two pallets', 2],
  ['Àncora', 'the lever arbor', 2],
  ['Scappamento', 'escape wheel', 2],
  ['Secondi', 'fourth wheel', 2],
  ['Mediana', 'third wheel', 2],
  ['Centro', 'centre wheel', 2],
  ['Bariletto', 'the barrel arbor', 2],
];

/** Overall height: mainplate, train, and the balance cock above it. */
export const CALIBRE_HEIGHT = PLATE_T + LV.cock[1];

export const CALIBRE_FACTS = {
  name: 'Calibro V.31',
  diameter: `${(PLATE_R * 2).toFixed(1)} mm (13¾‴)`,
  height: `${CALIBRE_HEIGHT.toFixed(1)} mm`,
  mainspring: Math.round(spiralLength(MAINSPRING.r0, MAINSPRING.r1, MAINSPRING.turns) / 10) * 10,
  frequency: '21,600 A/h · 3 Hz',
  reserve: '50 hours',
  jewels: 19,
  parts: 142,
};
