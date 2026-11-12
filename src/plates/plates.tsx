import type { ReactNode } from 'react';
import {
  AX,
  BALANCE_R,
  DEG,
  ESCAPE_R,
  GEAR,
  LV,
  PLATE_R,
  PLATE_T,
  TAU,
  add,
  angleTo,
  dist,
  escapeOutline,
  gearOutline,
  pitchR,
  polar,
  ptsToPath,
  spiral,
  trainAt,
  translatePts,
  type Gear,
  type P2,
} from '../lib/calibre';
import type { WatchSpec } from '../lib/watches';

/**
 * Plates are drawn in millimetres from the calibre's own data, the same numbers the
 * WebGL watch is built from. Strokes marked `data-draw` lay themselves down on scroll.
 */

const D = { 'data-draw': '', pathLength: 1 } as const;
const F = { 'data-fade': '' } as const;
const W = { c: 0.05, i: 0.085, h: 0.14, s: 0.075 };
const TEN_EIGHT = trainAt(10 * 3600 + 8 * 60 + 36.5);

interface SvgProps {
  viewBox: string;
  label: string;
  children: ReactNode;
  mode?: 'once' | 'scrub';
  className?: string;
}

export function PlateSvg({ viewBox, label, children, mode = 'once', className = '' }: SvgProps) {
  return (
    <svg className={`plate-svg ${className}`} viewBox={viewBox} data-plate={mode} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/** Geometry lives in a y-up frame; lettering is placed outside it so it reads the right way round. */
const Up = ({ children }: { children: ReactNode }) => <g transform="scale(1,-1)">{children}</g>;

const Key = ({ at, to, ch, size = 1.5 }: { at: P2; to?: P2; ch: string; size?: number }) => (
  <g {...F}>
    {to && <line className="s" x1={to[0]} y1={-to[1]} x2={at[0]} y2={-at[1]} strokeWidth={W.c} />}
    <text className="key" x={at[0]} y={-at[1]} fontSize={size} textAnchor="middle" dominantBaseline="central">
      {ch}
    </text>
  </g>
);

const Note = ({ at, children, size = 1.05, anchor = 'start', rot = 0 }: { at: P2; children: ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end'; rot?: number }) => (
  <text {...F} x={at[0]} y={-at[1]} fontSize={size} textAnchor={anchor} transform={rot ? `rotate(${rot} ${at[0]} ${-at[1]})` : undefined}>
    {children}
  </text>
);

function Wheel({ g, c, phase, hub, rim, spokes, fill = true }: { g: Gear; c: P2; phase: number; hub: number; rim: number; spokes: number; fill?: boolean }) {
  const rimIn = pitchR(g) - g.m * 1.25 - rim;
  return (
    <g>
      <path className={`i ${fill ? 'fill-paper' : ''}`} d={ptsToPath(translatePts(gearOutline(g, { phase }), c))} strokeWidth={W.i} {...D} />
      <circle className="i" cx={c[0]} cy={c[1]} r={rimIn} strokeWidth={W.c} {...D} />
      {Array.from({ length: spokes }, (_, k) => {
        const a = phase + 0.3 + (k / spokes) * TAU;
        const p0 = add(c, polar(hub, a));
        const p1 = add(c, polar(rimIn, a));
        return <line key={k} className="i" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} strokeWidth={W.i} {...D} />;
      })}
      <circle className="i fill-paper" cx={c[0]} cy={c[1]} r={hub} strokeWidth={W.i} {...D} />
    </g>
  );
}

const Pinion = ({ g, c, phase }: { g: Gear; c: P2; phase: number }) => (
  <path className="i fill-paper" d={ptsToPath(translatePts(gearOutline(g, { phase, add: 0.9, ded: 1.1 }), c))} strokeWidth={W.c} {...D} />
);

const Pivot = ({ c, r = 0.16 }: { c: P2; r?: number }) => <circle className="fill-s" cx={c[0]} cy={c[1]} r={r} {...F} />;

/* ------------------------------------------------------------ Tav. II */

export function PlateTrain() {
  const s = TEN_EIGHT;
  const chain = [AX.barrel, AX.centre, AX.third, AX.fourth, AX.escape];
  return (
    <PlateSvg viewBox="-20.5 -20.5 41 41" label="Plan of the going train: barrel, centre wheel, third wheel, fourth wheel and escape wheel, drawn in mesh.">
      <Up>
        <circle className="c" r={18.6} strokeWidth={W.c} {...D} />
        <line className="c" x1={-20} y1={0} x2={20} y2={0} strokeWidth={W.c} {...D} />
        <line className="c" x1={0} y1={-20} x2={0} y2={20} strokeWidth={W.c} {...D} />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * TAU;
          const r0 = i % 5 === 0 ? 17.8 : 18.2;
          return <line key={i} className="c" x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 18.6} y2={Math.sin(a) * 18.6} strokeWidth={W.c} {...F} />;
        })}
        <circle className="i" r={PLATE_R} strokeWidth={W.h} {...D} />
        <circle className="i" r={PLATE_R - 0.45} strokeWidth={W.c} {...D} />
        {/* furthest from the eye first, so nearer wheels cover them */}
        <Wheel g={GEAR.thirdWheel} c={AX.third} phase={s.third} hub={0.72} rim={0.42} spokes={5} />
        <path className="i fill-paper" d={ptsToPath(translatePts(escapeOutline(s.escape), AX.escape))} strokeWidth={W.i} {...D} />
        <circle className="i" cx={AX.escape[0]} cy={AX.escape[1]} r={1.42} strokeWidth={W.c} {...D} />
        <Wheel g={GEAR.centreWheel} c={AX.centre} phase={s.centre} hub={1.0} rim={0.5} spokes={5} />
        <Pinion g={GEAR.thirdPinion} c={AX.third} phase={s.third} />
        <Wheel g={GEAR.fourthWheel} c={AX.fourth} phase={s.fourth} hub={0.7} rim={0.4} spokes={6} />
        <Pinion g={GEAR.fourthPinion} c={AX.fourth} phase={s.fourth} />
        <Pinion g={GEAR.escapePinion} c={AX.escape} phase={s.escape} />
        <path className="i fill-paper" d={ptsToPath(translatePts(gearOutline(GEAR.barrel, { phase: s.barrel }), AX.barrel))} strokeWidth={W.i} {...D} />
        <circle className="i" cx={AX.barrel[0]} cy={AX.barrel[1]} r={6.05} strokeWidth={W.c} {...D} />
        <path className="i" d={ptsToPath(translatePts(spiral(1.35, 5.86, 10.5, 420, s.barrel), AX.barrel), false)} strokeWidth={0.045} {...D} />
        <circle className="i fill-paper" cx={AX.barrel[0]} cy={AX.barrel[1]} r={1.15} strokeWidth={W.i} {...D} />
        <Pinion g={GEAR.centrePinion} c={AX.centre} phase={s.centre} />
        {/* the line of centres, in red chalk */}
        <path className="s" d={ptsToPath(chain, false)} strokeWidth={W.s} {...D} />
        {chain.map((c, i) => (
          <Pivot key={i} c={c} />
        ))}
      </Up>
      <Key ch="a" at={[14.6, 14.4]} to={add(AX.barrel, polar(6.9, 45 * DEG))} />
      <Key ch="b" at={[-9.4, 9.6]} to={add(AX.centre, polar(5.2, 135 * DEG))} />
      <Key ch="c" at={[11.6, -8.2]} to={add(AX.third, polar(3.95, -20 * DEG))} />
      <Key ch="d" at={[4.6, -16.2]} to={add(AX.fourth, polar(4.0, -60 * DEG))} />
      <Key ch="e" at={[-12.4, -12.6]} to={add(AX.escape, polar(2.4, 215 * DEG))} />
      <Note at={[-19.6, 18.6]}>dal lato del quadrante</Note>
      <Note at={[19.6, -19.5]} anchor="end" size={0.95}>
        ∅ 31,0
      </Note>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ Tav. III */

const PALLET_OUTLINE: P2[] = [
  [2.78, -0.17], [2.3, -0.17], [2.3, 0.17], [2.78, 0.17], [2.78, 0.5], [2.2, 0.46], [1.85, 0.2], [0.55, 0.22], [0.3, 0.4],
  [-0.55, 1.05], [-0.86, 1.45], [-1.22, 1.16], [-0.75, 0.5], [-0.62, 0],
  [-0.75, -0.5], [-1.22, -1.16], [-0.86, -1.45], [-0.55, -1.05], [0.3, -0.4], [0.55, -0.22], [1.85, -0.2], [2.2, -0.46], [2.78, -0.5],
];
const rot = (p: P2, a: number): P2 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

export function PlateEscapement() {
  const s = TEN_EIGHT;
  const rest = angleTo(AX.pallet, AX.balance);
  const a = rest + 7.5 * DEG;
  const fork = PALLET_OUTLINE.map((p) => add(AX.pallet, rot(p, a)));
  const stone = (sy: number): P2[] => {
    const c: P2 = [-1.2, sy * 1.38];
    const dir = Math.atan2(-sy * 1.3, -2.06);
    return ([[-0.41, -0.15], [0.41, -0.15], [0.41, 0.15], [-0.41, 0.15]] as P2[]).map((p) => add(AX.pallet, rot(add(c, rot(p, dir)), a)));
  };
  const pin = add(AX.balance, polar(0.72, angleTo(AX.balance, AX.pallet) + 18 * DEG));
  const swing = (sign: number) => add(AX.pallet, polar(4.6, rest + sign * 7.5 * DEG));
  const cx = -6.6;
  const cy = -5.0;
  const h = 7.4;
  return (
    <PlateSvg viewBox={`${cx - h} ${-cy - h} ${h * 2} ${h * 2}`} label="The Swiss lever escapement: escape wheel, pallet fork with its two ruby pallets, and the roller of the balance.">
      <Up>
        <circle className="c" cx={AX.escape[0]} cy={AX.escape[1]} r={ESCAPE_R} strokeWidth={0.03} {...D} />
        <line className="c" x1={AX.escape[0] - (AX.balance[0] - AX.escape[0]) * 0.6} y1={AX.escape[1] - (AX.balance[1] - AX.escape[1]) * 0.6} x2={AX.balance[0] + (AX.balance[0] - AX.escape[0]) * 0.5} y2={AX.balance[1] + (AX.balance[1] - AX.escape[1]) * 0.5} strokeWidth={0.03} {...D} />
        {/* balance, only as much as the plate needs */}
        <circle className="i" cx={AX.balance[0]} cy={AX.balance[1]} r={BALANCE_R} strokeWidth={0.05} {...D} />
        <circle className="i" cx={AX.balance[0]} cy={AX.balance[1]} r={4.36} strokeWidth={0.03} {...D} />
        <circle className="i fill-paper" cx={AX.balance[0]} cy={AX.balance[1]} r={0.84} strokeWidth={0.05} {...D} />
        <circle className="i" cx={AX.balance[0]} cy={AX.balance[1]} r={0.17} strokeWidth={0.04} {...D} />
        {/* escape wheel */}
        <path className="i fill-paper" d={ptsToPath(translatePts(escapeOutline(s.escape), AX.escape))} strokeWidth={0.05} {...D} />
        <circle className="i" cx={AX.escape[0]} cy={AX.escape[1]} r={1.42} strokeWidth={0.03} {...D} />
        {[0, 1, 2].map((k) => {
          const an = s.escape + 0.2 + (k / 3) * TAU;
          const p0 = add(AX.escape, polar(0.5, an));
          const p1 = add(AX.escape, polar(1.42, an));
          return <line key={k} className="i" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} strokeWidth={0.05} {...D} />;
        })}
        <circle className="i fill-paper" cx={AX.escape[0]} cy={AX.escape[1]} r={0.5} strokeWidth={0.05} {...D} />
        {/* the fork and its stones */}
        <path className="i fill-paper" d={ptsToPath(fork)} strokeWidth={0.055} {...D} />
        <path className="fill-s" d={ptsToPath(stone(1))} {...F} />
        <path className="fill-s" d={ptsToPath(stone(-1))} {...F} />
        <circle className="fill-s" cx={pin[0]} cy={pin[1]} r={0.13} {...F} />
        <Pivot c={AX.pallet} r={0.1} />
        <Pivot c={AX.escape} r={0.1} />
        {/* the swing of the lever */}
        <line className="s" x1={AX.pallet[0]} y1={AX.pallet[1]} x2={swing(1)[0]} y2={swing(1)[1]} strokeWidth={0.03} {...D} />
        <line className="s" x1={AX.pallet[0]} y1={AX.pallet[1]} x2={swing(-1)[0]} y2={swing(-1)[1]} strokeWidth={0.03} {...D} />
        <path className="s" d={ptsToPath([-7.5, -3.75, 0, 3.75, 7.5].map((d) => add(AX.pallet, polar(4.2, rest + d * DEG))), false)} strokeWidth={0.035} {...D} />
      </Up>
      <Key ch="a" size={0.62} at={[-1.6, -9.4]} to={add(AX.escape, polar(2.3, -45 * DEG))} />
      <Key ch="b" size={0.62} at={[-4.2, -2.2]} to={add(AX.pallet, polar(0.9, 80 * DEG))} />
      <Key ch="c" size={0.62} at={[-9.6, -9.6]} to={stone(1)[0]} />
      <Key ch="d" size={0.62} at={[-12.2, -0.4]} to={add(AX.balance, polar(0.9, 140 * DEG))} />
      <Note at={add(AX.pallet, polar(5.0, rest + 2 * DEG))} size={0.5}>
        15°
      </Note>
      <Note at={[cx - h + 0.5, cy + h - 0.9]} size={0.46}>
        scala 5 : 1
      </Note>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ Tav. IV */

export function PlateBalance() {
  const coil = spiral(0.58, 3.36, 11.5, 520, 0.4);
  const arm = 22 * DEG;
  const arc = Array.from({ length: 61 }, (_, i) => polar(6.25, (90 - 135 + (270 * i) / 60) * DEG));
  const head = (at: P2, dir: number): P2[] => [add(at, polar(0.42, dir + 2.65)), at, add(at, polar(0.42, dir - 2.65))];
  return (
    <PlateSvg viewBox="-7.6 -7.6 15.2 15.2" label="The balance wheel with its fourteen timing screws and the hairspring of eleven and a half turns.">
      <Up>
        <line className="c" x1={-7.4} y1={0} x2={7.4} y2={0} strokeWidth={0.03} {...D} />
        <line className="c" x1={0} y1={-7.4} x2={0} y2={7.4} strokeWidth={0.03} {...D} />
        <circle className="c" r={5.72} strokeWidth={0.03} {...D} />
        <circle className="i fill-paper" r={BALANCE_R} strokeWidth={0.06} {...D} />
        <circle className="i" r={4.36} strokeWidth={0.05} {...D} />
        {[1, -1].map((sg) => (
          <g key={sg}>
            <line className="i" x1={Math.cos(arm) * 4.36 * sg} y1={Math.sin(arm) * 4.36 * sg + 0.36} x2={-Math.cos(arm) * 0.6 * sg} y2={-Math.sin(arm) * 0.6 * sg + 0.36} strokeWidth={0.05} {...D} />
            <line className="i" x1={Math.cos(arm) * 4.36 * sg} y1={Math.sin(arm) * 4.36 * sg - 0.36} x2={-Math.cos(arm) * 0.6 * sg} y2={-Math.sin(arm) * 0.6 * sg - 0.36} strokeWidth={0.05} {...D} />
          </g>
        ))}
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * TAU + 0.12;
          const p0 = polar(BALANCE_R, a);
          const p1 = polar(BALANCE_R + 0.5, a);
          return <line key={i} className="i" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} strokeWidth={0.36} strokeLinecap="butt" {...F} />;
        })}
        <path className="i" d={ptsToPath(coil, false)} strokeWidth={0.04} {...D} />
        <circle className="i fill-paper" r={0.52} strokeWidth={0.05} {...D} />
        <circle className="fill-s" r={0.15} {...F} />
        <circle className="fill-s" cx={coil[coil.length - 1][0]} cy={coil[coil.length - 1][1]} r={0.2} {...F} />
        <path className="s" d={ptsToPath(arc, false)} strokeWidth={0.04} {...D} />
        <path className="s" d={ptsToPath(head(arc[0], -45 * DEG - Math.PI / 2), false)} strokeWidth={0.04} {...D} />
        <path className="s" d={ptsToPath(head(arc[60], 225 * DEG + Math.PI / 2), false)} strokeWidth={0.04} {...D} />
      </Up>
      <Key ch="a" size={0.62} at={[6.6, 5.2]} to={polar(5.1, 38 * DEG)} />
      <Key ch="b" size={0.62} at={[-6.4, 5.6]} to={polar(2.6, 138 * DEG)} />
      <Key ch="c" size={0.62} at={[6.9, -3.4]} to={polar(5.5, (12 / 14) * 360 * DEG + 0.12)} />
      <Note at={[0, 6.72]} anchor="middle" size={0.5}>
        270° per parte
      </Note>
      <Note at={[-7.3, -7.2]} size={0.46}>
        scala 5 : 1
      </Note>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ Tav. V */

export function PlateWinding() {
  const s = TEN_EIGHT;
  const B = AX.barrel;
  const CW = AX.crownWheel;
  const ratchetPhase = 0.11;
  const clickAt = add(B, polar(pitchR(GEAR.ratchet) + 1.3, 196 * DEG));
  const click = ([[-1.5, -0.45], [0.9, -0.6], [1.5, 0.1], [0.6, 0.62], [-1.5, 0.4]] as P2[]).map((p) => add(clickAt, rot(p, 110 * DEG)));
  return (
    <PlateSvg viewBox="-5.5 -15.5 31 22" label="The winding train: crown, stem, crown wheel, ratchet wheel and click above the mainspring barrel.">
      <Up>
        <path className="c" d={ptsToPath(Array.from({ length: 50 }, (_, i) => polar(PLATE_R, (-28 + i * 2.6) * DEG)), false)} strokeWidth={W.c} {...D} />
        <path className="c" d={ptsToPath(Array.from({ length: 44 }, (_, i) => polar(19.5, (-22 + i * 2.2) * DEG)), false)} strokeWidth={W.c} {...D} />
        <line className="c" x1={-5} y1={0} x2={25} y2={0} strokeWidth={W.c} {...D} />
        {/* barrel and its spring, below */}
        <path className="i fill-paper" d={ptsToPath(translatePts(gearOutline(GEAR.barrel, { phase: s.barrel }), B))} strokeWidth={W.i} {...D} />
        <circle className="i" cx={B[0]} cy={B[1]} r={6.05} strokeWidth={W.c} {...D} />
        <path className="i" d={ptsToPath(translatePts(spiral(1.35, 5.86, 10.5, 420, s.barrel), B), false)} strokeWidth={0.045} {...D} />
        {/* ratchet and crown wheel, above, in red chalk */}
        <path className="s" d={ptsToPath(translatePts(gearOutline(GEAR.ratchet, { phase: ratchetPhase, add: 0.8, ded: 0.9 }), B))} strokeWidth={W.s} {...D} />
        <circle className="s" cx={B[0]} cy={B[1]} r={2.6} strokeWidth={W.c} {...D} />
        <path className="s" d={ptsToPath(translatePts(gearOutline(GEAR.crownWheel, { phase: angleTo(CW, B) + Math.PI / 32 + ratchetPhase * 1.5, add: 0.8, ded: 0.9 }), CW))} strokeWidth={W.s} {...D} />
        <circle className="s" cx={CW[0]} cy={CW[1]} r={1.7} strokeWidth={W.c} {...D} />
        <path className="s" d={ptsToPath(click)} strokeWidth={W.s} {...D} />
        <circle className="i fill-paper" cx={B[0]} cy={B[1]} r={1.05} strokeWidth={W.i} {...D} />
        {/* stem and crown */}
        <path className="i" d="M5.4 0.42H19.6M5.4 -0.42H19.6" strokeWidth={W.i} {...D} />
        <rect className="i fill-paper" x={9.4} y={-0.92} width={1.7} height={1.84} strokeWidth={W.i} {...D} />
        <rect className="i fill-paper" x={12.2} y={-1.12} width={1.1} height={2.24} strokeWidth={W.i} {...D} />
        <rect className="i fill-paper" x={19.5} y={-1.7} width={0.8} height={3.4} strokeWidth={W.i} {...D} />
        <rect className="i fill-paper" x={20.3} y={-2.75} width={2.6} height={5.5} rx={0.3} strokeWidth={W.h} {...D} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="i" x1={20.45} y1={-2.2 + i * 0.55} x2={22.75} y2={-2.2 + i * 0.55} strokeWidth={W.c} {...F} />
        ))}
        <Pivot c={B} />
        <Pivot c={CW} />
      </Up>
      <Key ch="a" size={1.2} at={[-3.6, 13.6]} to={add(B, polar(6.9, 150 * DEG))} />
      <Key ch="b" size={1.2} at={[13.8, 13.2]} to={add(B, polar(4.9, 52 * DEG))} />
      <Key ch="c" size={1.2} at={[17.2, 6.4]} to={add(CW, polar(3.2, 40 * DEG))} />
      <Key ch="d" size={1.2} at={[23.2, -4.6]} to={[21.6, -2.8]} />
      <Key ch="e" size={1.2} at={[-4.2, 0.9]} to={clickAt} />
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ developed section */

/** The train unrolled into one plane and cut through its arbors: plate below, bridges above. */
export function PlateSection({ dark = false }: { dark?: boolean }) {
  const order: [string, P2][] = [
    ['barrel', AX.barrel],
    ['centre', AX.centre],
    ['third', AX.third],
    ['fourth', AX.fourth],
    ['escape', AX.escape],
    ['pallet', AX.pallet],
    ['balance', AX.balance],
  ];
  const xs: number[] = [0];
  for (let i = 1; i < order.length; i++) xs.push(xs[i - 1] + dist(order[i - 1][1], order[i][1]));
  const [xB, xC, xT, xF, xE, xP, xBal] = xs;
  const disc = (x: number, r: number, m: number, t = 0.16) => <rect className="i fill-paper" x={x - r} y={m - t / 2} width={r * 2} height={t} strokeWidth={0.05} {...D} />;
  const pin = (x: number, r: number, span: P2) => <rect className="i fill-paper" x={x - r} y={span[0]} width={r * 2} height={span[1] - span[0]} strokeWidth={0.05} {...D} />;
  const arbor = (x: number, m0: number, m1: number) => <line className="i" x1={x} y1={m0} x2={x} y2={m1} strokeWidth={0.07} {...D} />;
  const jewel = (x: number, m: number) => <rect key={`j${x.toFixed(2)}${m.toFixed(2)}`} className="fill-s" x={x - 0.42} y={m - 0.2} width={0.84} height={0.4} {...F} />;
  const x0 = -8.6;
  const x1 = xBal + 6.8;
  return (
    <PlateSvg mode="scrub" className={dark ? 'on-dark' : ''} viewBox={`${x0 - 1.4} -5.3 ${x1 - x0 + 2.4} 8.9`} label="Developed cross-section of the Calibro V.31: every arbor of the train between the mainplate and its bridges.">
      <defs>
        <pattern id={dark ? 'hatch-d' : 'hatch'} width="0.34" height="0.34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.34" stroke={dark ? '#cdbf9f' : '#4a3423'} strokeWidth="0.035" />
        </pattern>
      </defs>
      {/* here m (plate towards bridges) is drawn upwards: y = -m handled by flipping below */}
      <g transform="scale(1,-1)">
        <rect x={x0} y={-PLATE_T} width={x1 - x0} height={PLATE_T} fill={`url(#${dark ? 'hatch-d' : 'hatch'})`} {...F} />
        <rect className="i" x={x0} y={-PLATE_T} width={x1 - x0} height={PLATE_T} strokeWidth={0.07} {...D} />
        <rect x={x0} y={LV.bridge[0]} width={xE + 1.6 - x0} height={LV.bridge[1] - LV.bridge[0]} fill={`url(#${dark ? 'hatch-d' : 'hatch'})`} {...F} />
        <rect className="i" x={x0} y={LV.bridge[0]} width={xE + 1.6 - x0} height={LV.bridge[1] - LV.bridge[0]} strokeWidth={0.07} {...D} />
        <rect x={xBal - 1.6} y={LV.cock[0]} width={x1 - (xBal - 1.6)} height={LV.cock[1] - LV.cock[0]} fill={`url(#${dark ? 'hatch-d' : 'hatch'})`} {...F} />
        <path className="i" d={`M${xBal - 1.6} ${LV.cock[0]}H${x1 - 2.4}V0H${x1}V${LV.cock[1]}H${xBal - 1.6}Z`} strokeWidth={0.07} {...D} />
        <rect className="i fill-paper" x={xP - 0.7} y={LV.palletBridge[0]} width={2.6} height={LV.palletBridge[1] - LV.palletBridge[0]} strokeWidth={0.05} {...D} />
        {/* barrel */}
        <path className="i fill-paper" d={`M${xB - 6.42} ${LV.barrel[0] + 0.1}V${LV.barrelTeeth[0]}H${xB - 6.95}V${LV.barrel[1]}H${xB + 6.95}V${LV.barrelTeeth[0]}H${xB + 6.42}V${LV.barrel[0] + 0.1}Z`} strokeWidth={0.06} {...D} />
        {Array.from({ length: 21 }, (_, i) => {
          const x = xB - 5.85 + i * 0.585;
          if (Math.abs(x - xB) < 1.3) return null;
          return <line key={i} className="i" x1={x} y1={0.36} x2={x} y2={1.16} strokeWidth={0.05} {...D} />;
        })}
        {pin(xB, 1.15, [0.22, 1.55])}
        {arbor(xB, 0, LV.keyless[1])}
        {disc(xB, 4.8, (LV.keyless[0] + LV.keyless[1]) / 2, 0.27)}
        {/* centre, third, fourth, escape */}
        {arbor(xC, -PLATE_T - 1.5, LV.bridge[0] + 0.3)}
        {pin(xC, 0.85, LV.centrePinion)}
        {disc(xC, pitchR(GEAR.centreWheel), LV.centreWheel)}
        {arbor(xT, -0.3, LV.bridge[0] + 0.3)}
        {pin(xT, 0.64, LV.thirdPinion)}
        {disc(xT, pitchR(GEAR.thirdWheel), LV.thirdWheel)}
        {arbor(xF, -PLATE_T - 0.8, LV.bridge[0] + 0.3)}
        {pin(xF, 0.52, LV.fourthPinion)}
        {disc(xF, pitchR(GEAR.fourthWheel), LV.fourthWheel)}
        {arbor(xE, -0.3, LV.bridge[0] + 0.3)}
        {pin(xE, 0.33, LV.escapePinion)}
        {disc(xE, ESCAPE_R, LV.escapeWheel, 0.12)}
        {/* pallet and balance */}
        {arbor(xP, -0.3, LV.palletBridge[0] + 0.2)}
        {disc(xP + 0.7, 2.0, LV.pallet, 0.14)}
        {arbor(xBal, -0.3, LV.cock[0] + 0.3)}
        {disc(xBal, 0.84, (LV.roller[0] + LV.roller[1]) / 2, 0.2)}
        {disc(xBal, BALANCE_R, (LV.balanceRim[0] + LV.balanceRim[1]) / 2, 0.35)}
        {disc(xBal, 3.36, (LV.hairspring[0] + LV.hairspring[1]) / 2, 0.14)}
        {[xC, xT, xF, xE].map((x) => jewel(x, LV.bridge[0] + 0.32))}
        {[xT, xF, xE, xP, xBal].map((x) => jewel(x, -0.22))}
        {jewel(xBal, LV.cock[0] + 0.25)}
        {jewel(xP, LV.palletBridge[0] + 0.13)}
      </g>
      {(
        [
          [xB, 'bariletto'],
          [xC, 'centro'],
          [xT, 'mediana'],
          [xF, 'secondi'],
          [xE, 'scappamento'],
          [xBal, 'bilanciere'],
        ] as [number, string][]
      ).map(([x, t]) => (
        <text key={t} {...F} x={x} y={2.5} fontSize={0.52} textAnchor="middle">
          {t}
        </text>
      ))}
      <g {...F}>
        <line className="c" x1={x0 - 0.5} y1={PLATE_T} x2={x0 - 0.5} y2={-LV.cock[1]} strokeWidth={0.04} />
        <line className="c" x1={x0 - 0.75} y1={PLATE_T} x2={x0 - 0.25} y2={PLATE_T} strokeWidth={0.04} />
        <line className="c" x1={x0 - 0.75} y1={-LV.cock[1]} x2={x0 - 0.25} y2={-LV.cock[1]} strokeWidth={0.04} />
      </g>
      <text {...F} className="dim" x={x0 - 0.2} y={-LV.cock[1] - 0.5} fontSize={0.42}>
        5,9
      </text>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ case plates for the collection */

export function PlateCase({ spec }: { spec: WatchSpec }) {
  const R = spec.diameter / 2;
  const k = R / 19.5;
  const L = spec.lugToLug / 2;
  const lw = spec.lugWidth / 2;
  const T = spec.thickness;
  const ex = R + 15; // where the elevation stands
  const zTop = T * 0.36;
  const zBot = -T * 0.64;
  const diver = spec.bezel === 'dive';
  const handA = (deg: number, len: number) => polar(len, (90 - deg) * DEG);
  const dimY = -(L + 5.2);
  const lug = (sx: number, sy: number) =>
    `M${sx * lw} ${sy * Math.sqrt(R * R - lw * lw) * 0.985}L${sx * lw} ${sy * L}L${sx * (lw + 2.6 * k)} ${sy * L}L${sx * (lw + 2.6 * k)} ${sy * Math.sqrt(Math.max(0, R * R - (lw + 2.6 * k) ** 2)) * 0.985}`;
  return (
    <PlateSvg viewBox={`${-R - 9} ${-L - 9.5} ${R * 2 + 38} ${L * 2 + 18}`} label={`Plan and side elevation of the ${spec.name}, with its principal dimensions.`}>
      <Up>
        {/* construction */}
        <line className="c" x1={-R - 7} y1={0} x2={ex + T} y2={0} strokeWidth={0.09} {...D} />
        <line className="c" x1={0} y1={-L - 6} x2={0} y2={L + 6} strokeWidth={0.09} {...D} />
        <circle className="c" r={R * 1.27} strokeWidth={0.09} {...D} />
        <line className="c" x1={-R} y1={L} x2={ex + zTop + 3} y2={L} strokeWidth={0.07} {...D} />
        <line className="c" x1={-R} y1={-L} x2={ex + zTop + 3} y2={-L} strokeWidth={0.07} {...D} />
        {/* plan */}
        <circle className="i" r={R} strokeWidth={0.2} {...D} />
        <circle className="i" r={R - (diver ? 2.6 : 1.5) * k} strokeWidth={0.13} {...D} />
        <circle className="i" r={16.0 * k} strokeWidth={0.1} {...D} />
        {[1, -1].map((sx) => [1, -1].map((sy) => <path key={`${sx}${sy}`} className="i" d={lug(sx, sy)} strokeWidth={0.18} {...D} />))}
        <rect className="i" x={R + 0.7} y={-2.7 * k} width={2.8 * k} height={5.4 * k} rx={0.3} strokeWidth={0.18} {...D} />
        {spec.crownGuards && <path className="i" d={`M${R * 0.94} ${5.6 * k}L${R + 2.4} ${3.9 * k}M${R * 0.94} ${-5.6 * k}L${R + 2.4} ${-3.9 * k}`} strokeWidth={0.18} {...D} />}
        {Array.from({ length: 12 }, (_, h) => {
          if (spec.seconds === 'small' && h === 6) return null;
          const a = (90 - h * 30) * DEG;
          const r0 = (h % 3 === 0 ? 11.2 : 12.2) * k;
          return <line key={h} className="i" x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 14.6 * k} y2={Math.sin(a) * 14.6 * k} strokeWidth={h % 3 === 0 ? 0.26 : 0.16} {...D} />;
        })}
        {diver &&
          Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * TAU;
            return <line key={i} className="i" x1={Math.cos(a) * (R - 0.2)} y1={Math.sin(a) * (R - 0.2)} x2={Math.cos(a) * (R + 0.45)} y2={Math.sin(a) * (R + 0.45)} strokeWidth={0.1} {...F} />;
          })}
        {spec.bezel === 'gmt' && <circle className="i" r={R - 0.8 * k} strokeWidth={0.07} {...D} />}
        {spec.seconds === 'small' && <circle className="i" cx={0} cy={-8.6 * k} r={4.3 * k} strokeWidth={0.12} {...D} />}
        <line className="s" x1={0} y1={0} x2={handA(304, 9.6 * k)[0]} y2={handA(304, 9.6 * k)[1]} strokeWidth={0.34} {...D} />
        <line className="s" x1={0} y1={0} x2={handA(51, 14.2 * k)[0]} y2={handA(51, 14.2 * k)[1]} strokeWidth={0.26} {...D} />
        {spec.gmtHand && <line className="s" x1={0} y1={0} x2={handA(200, 13 * k)[0]} y2={handA(200, 13 * k)[1]} strokeWidth={0.14} {...D} />}
        <circle className="fill-s" r={0.6} {...F} />
        {/* elevation, seen from the crown */}
        <g transform={`translate(${ex} 0)`}>
          <path
            className="i"
            d={`M${zBot + 1.3} ${-R * 0.94}V${R * 0.94}M${zTop - 1.4} ${-R}V${R}M${zBot + 1.3} ${R * 0.94}L${zTop - 1.4} ${R}M${zBot + 1.3} ${-R * 0.94}L${zTop - 1.4} ${-R}`}
            strokeWidth={0.18}
            {...D}
          />
          <path className="i" d={`M${zTop - 1.4} ${R * 0.985}Q${zTop * 0.2} ${R + (L - R) * 0.5} ${zBot + 1.6} ${L}L${zBot + 0.4} ${L - 0.5}L${zBot + 1.3} ${R * 0.7}`} strokeWidth={0.18} {...D} />
          <path className="i" d={`M${zTop - 1.4} ${-R * 0.985}Q${zTop * 0.2} ${-R - (L - R) * 0.5} ${zBot + 1.6} ${-L}L${zBot + 0.4} ${-L + 0.5}L${zBot + 1.3} ${-R * 0.7}`} strokeWidth={0.18} {...D} />
          <path className="i" d={`M${zTop - 1.4} ${R * 0.96}H${zTop - 0.3}V${-R * 0.96}H${zTop - 1.4}`} strokeWidth={0.14} {...D} />
          <path className="i" d={`M${zTop - 0.3} ${R * 0.84}Q${zTop + (diver ? 0.5 : 1.3)} 0 ${zTop - 0.3} ${-R * 0.84}`} strokeWidth={0.12} {...D} />
          <path className="i" d={`M${zBot + 1.3} ${R * 0.9}L${zBot} ${R * 0.8}V${-R * 0.8}L${zBot + 1.3} ${-R * 0.9}`} strokeWidth={0.14} {...D} />
          <circle className="i" cx={(zTop + zBot) / 2 + 1} cy={0} r={2.7 * k} strokeWidth={0.18} {...D} />
          <circle className="i" cx={(zTop + zBot) / 2 + 1} cy={0} r={1.0 * k} strokeWidth={0.1} {...D} />
        </g>
        {/* dimensions in red chalk */}
        <path className="s" d={`M${-R} ${-dimY}H${R}M${-R} ${-dimY - 1}V${-dimY + 1}M${R} ${-dimY - 1}V${-dimY + 1}`} strokeWidth={0.12} {...D} />
        <path className="s" d={`M${ex + zTop + 3.6} ${-L}V${L}M${ex + zTop + 2.6} ${-L}H${ex + zTop + 4.6}M${ex + zTop + 2.6} ${L}H${ex + zTop + 4.6}`} strokeWidth={0.12} {...D} />
        <path className="s" d={`M${ex + zBot} ${-L - 3.6}H${ex + zTop + 0.6}M${ex + zBot} ${-L - 4.6}V${-L - 2.6}M${ex + zTop + 0.6} ${-L - 4.6}V${-L - 2.6}`} strokeWidth={0.12} {...D} />
        <path className="s" d={`M${-lw} ${-L - 3.6}H${lw}M${-lw} ${-L - 4.6}V${-L - 2.6}M${lw} ${-L - 4.6}V${-L - 2.6}`} strokeWidth={0.12} {...D} />
      </Up>
      <text {...F} className="dim" x={0} y={dimY - 1.3} fontSize={2.1} textAnchor="middle">
        ∅ {String(spec.diameter).replace('.', ',')}
      </text>
      <text {...F} className="dim" x={ex + zTop + 5.4} y={0.7} fontSize={2.1} transform={`rotate(-90 ${ex + zTop + 5.4} 0.7)`} textAnchor="middle">
        {String(spec.lugToLug).replace('.', ',')}
      </text>
      <text {...F} className="dim" x={ex + (zTop + zBot) / 2 + 0.3} y={L + 7.6} fontSize={2.1} textAnchor="middle">
        {String(spec.thickness).replace('.', ',')}
      </text>
      <text {...F} className="dim" x={0} y={L + 7.6} fontSize={2.1} textAnchor="middle">
        {spec.lugWidth}
      </text>
      <text {...F} x={-R - 8} y={L + 7.9} fontSize={2.5}>
        pianta e fianco
      </text>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ proportion study, for the margins */

export function PlateProportion() {
  const R = 19.5;
  const phi = 1.618;
  return (
    <PlateSvg mode="scrub" viewBox="-66 -66 132 132" label="A proportion study: the case inscribed in a square and a circle.">
      <circle className="c" r={R} strokeWidth={0.16} {...D} />
      <circle className="c" r={R * phi} strokeWidth={0.14} {...D} />
      <circle className="c" r={R * phi * phi} strokeWidth={0.14} {...D} />
      <circle className="c" r={R * phi * phi * Math.SQRT2 * 0.88} strokeWidth={0.12} {...D} />
      <rect className="c" x={-R * phi * phi} y={-R * phi * phi} width={R * phi * phi * 2} height={R * phi * phi * 2} strokeWidth={0.14} {...D} />
      <path className="c" d={`M${-R * phi * phi} ${-R * phi * phi}L${R * phi * phi} ${R * phi * phi}M${R * phi * phi} ${-R * phi * phi}L${-R * phi * phi} ${R * phi * phi}`} strokeWidth={0.12} {...D} />
      <path className="c" d={`M-66 0H66M0 -66V66`} strokeWidth={0.12} {...D} />
      <path className="c" d={ptsToPath(gearOutline({ N: 48, m: 0.58 }), true)} strokeWidth={0.14} {...D} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * TAU;
        return <line key={i} className="c" x1={Math.cos(a) * R * phi} y1={Math.sin(a) * R * phi} x2={Math.cos(a) * R * phi * phi} y2={Math.sin(a) * R * phi * phi} strokeWidth={0.1} {...D} />;
      })}
    </PlateSvg>
  );
}
