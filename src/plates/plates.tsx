import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import {
  AX,
  BALANCE_R,
  BANKING,
  CALIBRE_HEIGHT,
  COCK_FOOT,
  DEG,
  ESCAPE_R,
  GEAR,
  HAIRSPRING,
  LV,
  MAINSPRING,
  PLATE_R,
  PLATE_T,
  TAU,
  add,
  angleTo,
  barrelBridgeSegs,
  cockSegs,
  dist,
  escapeOutline,
  gearOutline,
  pitchR,
  polar,
  ptsToPath,
  segsToPoints,
  spiral,
  trainAt,
  trainBridgeSegs,
  translatePts,
  type Gear,
  type P2,
} from '../lib/calibre';
import type { WatchSpec } from '../lib/watches';
import { prefersReducedMotion } from '../lib/env';
import { onFrame } from '../lib/frame';
import { isStill } from '../lib/stillness';

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
  svgRef?: Ref<SVGSVGElement>;
}

export function PlateSvg({ viewBox, label, children, mode = 'once', className = '', svgRef }: SvgProps) {
  return (
    <svg ref={svgRef} className={`plate-svg ${className}`} viewBox={viewBox} data-plate={mode} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

/** Geometry lives in a y-up frame; lettering is placed outside it so it reads the right way round. */
const Up = ({ children }: { children: ReactNode }) => <g transform="scale(1,-1)">{children}</g>;

const Key = ({ at, to, ch, size = 1.5 }: { at: P2; to?: P2; ch: string; size?: number }) => (
  <g {...F}>
    {to && <line className="s" x1={to[0]} y1={-to[1]} x2={at[0]} y2={-at[1]} strokeWidth={W.c} />}
    <text className="key halo" x={at[0]} y={-at[1]} fontSize={size} textAnchor="middle" dominantBaseline="central">
      {ch}
    </text>
  </g>
);

const Note = ({ at, children, size = 1.05, anchor = 'start', rot = 0 }: { at: P2; children: ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end'; rot?: number }) => (
  <text {...F} className="halo" x={at[0]} y={-at[1]} fontSize={size} textAnchor={anchor} transform={rot ? `rotate(${rot} ${at[0]} ${-at[1]})` : undefined}>
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

/** A jewel seen in plan: the stone as a red-chalk ring round its pivot. */
const Jewel = ({ c, r = 0.5 }: { c: P2; r?: number }) => (
  <g {...F}>
    <circle className="s" cx={c[0]} cy={c[1]} r={r} strokeWidth={r * 0.2} />
    <circle className="fill-s" cx={c[0]} cy={c[1]} r={r * 0.3} />
  </g>
);

/** Lines that cannot be drawn in one stroke: outlines of what lies on the far side. */
const Hidden = ({ pts, w = W.c, dash = '0.42 0.3' }: { pts: P2[]; w?: number; dash?: string }) => (
  <path className="c" d={ptsToPath(pts)} strokeWidth={w} strokeDasharray={dash} {...F} />
);

const num = (n: number, d = 1) => n.toFixed(d).replace('.', ',');

/**
 * A dimension as a draughtsman leaves it, in red chalk: extension lines from the two points, the
 * dimension line between them at `off` to the left of a→b, and the figure written along it.
 */
function Dim({ a, b, off, label, size = 0.6, gap = 0.55 }: { a: P2; b: P2; off: number; label: string; size?: number; gap?: number }) {
  const dir = angleTo(a, b);
  const n = polar(1, dir + Math.PI / 2);
  const sg = Math.sign(off) || 1;
  const pa: P2 = [a[0] + n[0] * off, a[1] + n[1] * off];
  const pb: P2 = [b[0] + n[0] * off, b[1] + n[1] * off];
  const ext = (p: P2, q: P2): string => `M${p[0] + n[0] * sg * size * 0.3} ${p[1] + n[1] * sg * size * 0.3}L${q[0] + n[0] * sg * size * 0.45} ${q[1] + n[1] * sg * size * 0.45}`;
  const tick = (q: P2) => {
    const t = polar(size * 0.32, dir + Math.PI / 4);
    return `M${q[0] - t[0]} ${q[1] - t[1]}L${q[0] + t[0]} ${q[1] + t[1]}`;
  };
  const mid: P2 = [(pa[0] + pb[0]) / 2 + n[0] * sg * size * gap, (pa[1] + pb[1]) / 2 + n[1] * sg * size * gap];
  let deg = (-dir * 180) / Math.PI;
  if (deg > 90 || deg < -90) deg += 180;
  return (
    <g>
      <g transform="scale(1,-1)">
        <path className="s" d={`${ext(a, pa)}${ext(b, pb)}`} strokeWidth={size * 0.06} {...F} />
        <path className="s" d={`M${pa[0]} ${pa[1]}L${pb[0]} ${pb[1]}${tick(pa)}${tick(pb)}`} strokeWidth={size * 0.09} {...D} />
      </g>
      <text {...F} className="dim halo" x={mid[0]} y={-mid[1]} fontSize={size} textAnchor="middle" dominantBaseline="central" transform={`rotate(${deg} ${mid[0]} ${-mid[1]})`}>
        {label}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------ plates that run */

/** Whatever is wrapped in this turns, slides or swings once the plate has been drawn. */
const Live = ({ id, children }: { id: string; children: ReactNode }) => <g data-live={id}>{children}</g>;

interface Mover {
  /** turn every element with this name about a point; radians, anticlockwise in the plate's own frame */
  spin(id: string, rad: number, about: P2): void;
  /** slide every element with this name */
  shift(id: string, dx: number, dy: number): void;
  all(id: string): Element[];
}

/**
 * Sets a plate in motion. Nothing moves until its lines have finished drawing (the page marks the
 * svg `data-drawn`), nor while it is off screen, nor for a visitor who has asked for less motion.
 * `tick` receives the seconds since the plate began to move and a factor that eases from 0 to 1,
 * so that the drawing leaves its drawn pose gently instead of jumping.
 */
function useLive(tick: (m: Mover, seconds: number, ease: number) => void, always = false) {
  const ref = useRef<SVGSVGElement>(null);
  const fn = useRef(tick);
  fn.current = tick;
  useEffect(() => {
    const svg = ref.current;
    if (!svg || prefersReducedMotion()) return;
    const cache = new Map<string, Element[]>();
    const all = (id: string) => {
      let list = cache.get(id);
      if (!list) cache.set(id, (list = Array.from(svg.querySelectorAll(`[data-live="${id}"]`))));
      return list;
    };
    const mover: Mover = {
      all,
      spin: (id, rad, c) => {
        const v = `rotate(${(rad / DEG).toFixed(2)} ${c[0].toFixed(3)} ${c[1].toFixed(3)})`;
        for (const el of all(id)) el.setAttribute('transform', v);
      },
      shift: (id, dx, dy) => {
        const v = `translate(${dx.toFixed(3)} ${dy.toFixed(3)})`;
        for (const el of all(id)) el.setAttribute('transform', v);
      },
    };
    let visible = false;
    let began = 0;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.12 });
    io.observe(svg);
    // paused time is taken out of the clock, so a plate picks up where it stopped
    let held = 0;
    let last = 0;
    const off = onFrame((now) => {
      const dt = last ? now - last : 0;
      last = now;
      if (isStill()) {
        held += dt;
        return;
      }
      if (!visible || (!always && svg.dataset.drawn !== 'true')) return;
      if (!began) began = now;
      const sec = (now - began - held) / 1000;
      const k = Math.min(1, sec / 1.8);
      fn.current(mover, sec, k * k * (3 - 2 * k));
    });
    return () => {
      io.disconnect();
      off();
    };
  }, [always]);
  return ref;
}

const wrapPi = (a: number) => {
  let x = (a + Math.PI) % TAU;
  if (x < 0) x += TAU;
  return x - Math.PI;
};
const clockNow = () => {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
};

/**
 * Carries a drawing from the pose it was drawn in to the live one by the short way round, and then
 * follows it: `to(key, live, drawn, ease)` returns how far to turn.
 */
function follower() {
  const base = new Map<string, number>();
  return (key: string, live: number, drawn: number, ease: number) => {
    let b = base.get(key);
    if (b === undefined) base.set(key, (b = wrapPi(live - drawn) - live));
    return (live + b) * ease;
  };
}

/** Shown only where the plate actually moves. */
const LiveNote = ({ at, children, size = 0.46, anchor = 'start' }: { at: P2; children: ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end' }) => (
  <text {...F} className="halo live-note" x={at[0]} y={-at[1]} fontSize={size} textAnchor={anchor}>
    {children}
  </text>
);

/* ------------------------------------------------------------ shared parts */

const BEATS = 6; // a second, at 21,600 an hour

const PALLET_OUTLINE: P2[] = [
  [2.78, -0.17], [2.3, -0.17], [2.3, 0.17], [2.78, 0.17], [2.78, 0.5], [2.2, 0.46], [1.85, 0.2], [0.55, 0.22], [0.3, 0.4],
  [-0.55, 1.05], [-0.86, 1.45], [-1.22, 1.16], [-0.75, 0.5], [-0.62, 0],
  [-0.75, -0.5], [-1.22, -1.16], [-0.86, -1.45], [-0.55, -1.05], [0.3, -0.4], [0.55, -0.22], [1.85, -0.2], [2.2, -0.46], [2.78, -0.5],
];
const rot = (p: P2, a: number): P2 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const REST = angleTo(AX.pallet, AX.balance);
const forkAt = (a: number) => PALLET_OUTLINE.map((p) => add(AX.pallet, rot(p, a)));
const stoneAt = (sy: number, a: number): P2[] => {
  const c: P2 = [-1.2, sy * 1.38];
  const dir = Math.atan2(-sy * 1.3, -2.06);
  return ([[-0.41, -0.15], [0.41, -0.15], [0.41, 0.15], [-0.41, 0.15]] as P2[]).map((p) => add(AX.pallet, rot(add(c, rot(p, dir)), a)));
};

const Mainspring = ({ c, phase, w = 0.04 }: { c: P2; phase: number; w?: number }) => (
  <path className="i" d={ptsToPath(translatePts(spiral(MAINSPRING.r0, MAINSPRING.r1, MAINSPRING.turns, 760, phase), c), false)} strokeWidth={w} {...D} />
);

/* ------------------------------------------------------------ Tav. II */

export function PlateTrain() {
  const s = TEN_EIGHT;
  const chain = [AX.barrel, AX.centre, AX.third, AX.fourth, AX.escape, AX.pallet, AX.balance];
  const lever = REST + 7.5 * DEG;
  const arm = REST + 70 * DEG;
  // once drawn, the train takes up the time of day and runs: one turn a minute at the fourth wheel
  const to = useRef(follower()).current;
  const svgRef = useLive((m, _sec, k) => {
    const n = trainAt(clockNow());
    m.spin('barrel', to('barrel', n.barrel, s.barrel, k), AX.barrel);
    m.spin('centre', to('centre', n.centre, s.centre, k), AX.centre);
    m.spin('third', to('third', n.third, s.third, k), AX.third);
    m.spin('fourth', to('fourth', n.fourth, s.fourth, k), AX.fourth);
    m.spin('escape', to('escape', n.escape, s.escape, k), AX.escape);
    m.spin('lever', (n.pallet - 7.5 * DEG) * k, AX.pallet);
    m.spin('balance', n.balance * k, AX.balance);
  });
  return (
    <PlateSvg svgRef={svgRef} viewBox="-20.5 -20.5 41 41" label="Plan of the going train from the dial side: barrel, centre, third and fourth wheels, escape wheel, lever and balance, drawn in mesh with their tooth counts; the bridges behind are shown in broken line.">
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
        {/* what stands behind the wheels: the two bridges and the balance cock */}
        <Hidden pts={segsToPoints(barrelBridgeSegs())} />
        <Hidden pts={segsToPoints(trainBridgeSegs())} />
        <Hidden pts={segsToPoints(cockSegs())} />
        {/* balance, furthest from the eye */}
        <circle className="i" cx={AX.balance[0]} cy={AX.balance[1]} r={BALANCE_R} strokeWidth={W.i} {...D} />
        <circle className="i" cx={AX.balance[0]} cy={AX.balance[1]} r={4.36} strokeWidth={W.c} {...D} />
        <Live id="balance">
          {[1, -1].map((sg) => {
            const p0 = add(AX.balance, polar(4.36, arm + (sg > 0 ? 0 : Math.PI)));
            const p1 = add(AX.balance, polar(0.84, arm + (sg > 0 ? 0 : Math.PI)));
            return <line key={sg} className="i" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} strokeWidth={0.5} strokeLinecap="butt" strokeOpacity={0.28} {...F} />;
          })}
        </Live>
        <path className="c" d={ptsToPath(translatePts(spiral(HAIRSPRING.r0, HAIRSPRING.r1, HAIRSPRING.turns, 420, 0.4), AX.balance), false)} strokeWidth={0.03} {...D} />
        <circle className="i fill-paper" cx={AX.balance[0]} cy={AX.balance[1]} r={0.84} strokeWidth={W.c} {...D} />
        {/* then the train, furthest first, so nearer wheels cover them */}
        <Live id="third">
          <Wheel g={GEAR.thirdWheel} c={AX.third} phase={s.third} hub={0.72} rim={0.42} spokes={5} />
        </Live>
        <Live id="escape">
          <path className="i fill-paper" d={ptsToPath(translatePts(escapeOutline(s.escape), AX.escape))} strokeWidth={W.i} {...D} />
          <circle className="i" cx={AX.escape[0]} cy={AX.escape[1]} r={1.42} strokeWidth={W.c} {...D} />
        </Live>
        <Live id="lever">
          <path className="i fill-paper" d={ptsToPath(forkAt(lever))} strokeWidth={W.c} {...D} />
          <path className="fill-s" d={ptsToPath(stoneAt(1, lever))} {...F} />
          <path className="fill-s" d={ptsToPath(stoneAt(-1, lever))} {...F} />
        </Live>
        <Live id="centre">
          <Wheel g={GEAR.centreWheel} c={AX.centre} phase={s.centre} hub={1.0} rim={0.5} spokes={5} />
        </Live>
        <Live id="third">
          <Pinion g={GEAR.thirdPinion} c={AX.third} phase={s.third} />
        </Live>
        <Live id="fourth">
          <Wheel g={GEAR.fourthWheel} c={AX.fourth} phase={s.fourth} hub={0.7} rim={0.4} spokes={6} />
          <Pinion g={GEAR.fourthPinion} c={AX.fourth} phase={s.fourth} />
        </Live>
        <Live id="escape">
          <Pinion g={GEAR.escapePinion} c={AX.escape} phase={s.escape} />
        </Live>
        <Live id="barrel">
          <path className="i fill-paper" d={ptsToPath(translatePts(gearOutline(GEAR.barrel, { phase: s.barrel }), AX.barrel))} strokeWidth={W.i} {...D} />
          <circle className="i" cx={AX.barrel[0]} cy={AX.barrel[1]} r={6.05} strokeWidth={W.c} {...D} />
          <Mainspring c={AX.barrel} phase={s.barrel} />
        </Live>
        <circle className="i fill-paper" cx={AX.barrel[0]} cy={AX.barrel[1]} r={1.15} strokeWidth={W.i} {...D} />
        <Live id="centre">
          <Pinion g={GEAR.centrePinion} c={AX.centre} phase={s.centre} />
        </Live>
        {/* the line of centres, in red chalk, and a jewel at every pivot */}
        <path className="s" d={ptsToPath(chain, false)} strokeWidth={W.s} {...D} />
        <Pivot c={AX.barrel} />
        <Jewel c={AX.centre} r={0.42} />
        <Jewel c={AX.third} r={0.36} />
        <Jewel c={AX.fourth} r={0.36} />
        <Jewel c={AX.escape} r={0.3} />
        <Jewel c={AX.pallet} r={0.26} />
        <Jewel c={AX.balance} r={0.38} />
      </Up>
      <Key ch="a" at={[14.9, 14.5]} to={add(AX.barrel, polar(6.9, 45 * DEG))} />
      <Key ch="b" at={[-9.4, 9.9]} to={add(AX.centre, polar(5.2, 135 * DEG))} />
      <Key ch="c" at={[12.4, -7.6]} to={add(AX.third, polar(3.95, -15 * DEG))} />
      <Key ch="d" at={[5.2, -16.4]} to={add(AX.fourth, polar(4.0, -60 * DEG))} />
      <Key ch="e" at={[-5.0, -16.6]} to={add(AX.escape, polar(2.4, 250 * DEG))} />
      <Note at={add(AX.barrel, [0, 7.5])} anchor="middle" size={0.82}>
        z 80
      </Note>
      <Note at={[-5.3, 3.3]} anchor="end" size={0.82}>
        z 64
      </Note>
      <Note at={[7.1, -4.2]} size={0.82}>
        z 60
      </Note>
      <Note at={[1.0, -13.5]} size={0.82}>
        z 72
      </Note>
      <Note at={[-6.9, -10.4]} anchor="end" size={0.82}>
        z 15
      </Note>
      <Note at={[-19.6, 18.6]}>dal lato del quadrante</Note>
      <LiveNote at={[19.6, 18.6]} anchor="end" size={0.95}>
        in tempo reale
      </LiveNote>
      <Note at={[-19.6, -19.5]} size={0.92}>
        64 : 8 × 60 : 8 = 60 : 1
      </Note>
      <Note at={[19.6, -19.5]} anchor="end" size={0.95}>
        ∅ {num(PLATE_R * 2)}
      </Note>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ Tav. III */

export function PlateEscapement() {
  const s = TEN_EIGHT;
  const a = REST + 7.5 * DEG;
  const pin = add(AX.balance, polar(0.72, angleTo(AX.balance, AX.pallet) + 18 * DEG));
  const swing = (sign: number, r: number) => add(AX.pallet, polar(r, REST + sign * 7.5 * DEG));
  const cx = -6.15;
  const cy = -5.75;
  const h = 6.05;
  const ax = polar(1, angleTo(AX.escape, AX.balance));
  // Once drawn it runs at an eighth of its speed, so the beat can be followed: the pin comes round on
  // the roller, enters the fork and throws the lever across; one tooth escapes; the pin leaves again.
  const svgRef = useLive((m, sec, k) => {
    const beats = 1.5 + (sec * BEATS) / 8;
    const n = Math.round(beats);
    const x = beats - n;
    const t = Math.min(1, Math.max(0, (x + 0.03) / 0.06));
    const across = t * t * (3 - 2 * t);
    const side = Math.abs(n) % 2 === 0 ? 1 : -1;
    const swing = Math.sin(Math.PI * beats) * 270 * DEG;
    m.spin('lever', (side * (1 - 2 * across) - 1) * 7.5 * DEG, AX.pallet);
    m.spin('escape', ((n - 2 + across) * TAU) / 30, AX.escape);
    m.spin('pin', (swing - 18 * DEG) * k, AX.balance);
  });
  return (
    <PlateSvg svgRef={svgRef} viewBox={`${cx - h} ${-cy - h} ${h * 2} ${h * 2}`} label="The Swiss lever escapement at five times life size: the fifteen-tooth escape wheel, the lever with its two ruby pallets between the banking pins, and the roller of the balance with its impulse pin.">
      <defs>
        <clipPath id="esc-clip">
          <rect x={cx - h + 0.35} y={-cy - h + 0.35} width={h * 2 - 0.7} height={h * 2 - 0.7} />
        </clipPath>
      </defs>
      <Up>
        {/* the line of centres */}
        <line className="c" x1={AX.escape[0] - ax[0] * 4.2} y1={AX.escape[1] - ax[1] * 4.2} x2={AX.balance[0] + ax[0] * 3.4} y2={AX.balance[1] + ax[1] * 3.4} strokeWidth={0.03} {...D} />
        {/* balance: its rim passes over the lever, so only an arc of it is given */}
        <g clipPath="url(#esc-clip)">
          <circle className="c" cx={AX.balance[0]} cy={AX.balance[1]} r={BALANCE_R} strokeWidth={0.05} {...D} />
          <circle className="c" cx={AX.balance[0]} cy={AX.balance[1]} r={4.36} strokeWidth={0.03} {...D} />
        </g>
        <circle className="i fill-paper" cx={AX.balance[0]} cy={AX.balance[1]} r={0.84} strokeWidth={0.055} {...D} />
        <circle className="i" cx={AX.balance[0]} cy={AX.balance[1]} r={0.5} strokeWidth={0.03} {...D} />
        {/* escape wheel */}
        <circle className="c" cx={AX.escape[0]} cy={AX.escape[1]} r={ESCAPE_R} strokeWidth={0.03} {...D} />
        <Live id="escape">
          <path className="i fill-paper" d={ptsToPath(translatePts(escapeOutline(s.escape), AX.escape))} strokeWidth={0.055} {...D} />
          <circle className="i" cx={AX.escape[0]} cy={AX.escape[1]} r={1.42} strokeWidth={0.035} {...D} />
          {[0, 1, 2].map((k) => {
            const an = s.escape + 0.2 + (k / 3) * TAU;
            const p0 = add(AX.escape, polar(0.5, an));
            const p1 = add(AX.escape, polar(1.42, an));
            return <line key={k} className="i" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} strokeWidth={0.26} strokeLinecap="butt" strokeOpacity={0.3} {...F} />;
          })}
          <circle className="i fill-paper" cx={AX.escape[0]} cy={AX.escape[1]} r={0.5} strokeWidth={0.05} {...D} />
          <Pinion g={GEAR.escapePinion} c={AX.escape} phase={s.escape} />
        </Live>
        {/* the swing of the lever, and the pins that bound it */}
        <line className="s" x1={AX.pallet[0]} y1={AX.pallet[1]} x2={swing(1, 5.5)[0]} y2={swing(1, 5.5)[1]} strokeWidth={0.03} {...D} />
        <line className="s" x1={AX.pallet[0]} y1={AX.pallet[1]} x2={swing(-1, 5.5)[0]} y2={swing(-1, 5.5)[1]} strokeWidth={0.03} {...D} />
        <path className="s" d={ptsToPath([-7.5, -3.75, 0, 3.75, 7.5].map((d) => add(AX.pallet, polar(5.2, REST + d * DEG))), false)} strokeWidth={0.035} {...D} />
        <path className="c" d={ptsToPath(forkAt(REST - 7.5 * DEG))} strokeWidth={0.035} strokeDasharray="0.16 0.12" {...F} />
        {/* the lever and its stones */}
        <Live id="lever">
          <path className="i fill-paper" d={ptsToPath(forkAt(a))} strokeWidth={0.06} {...D} />
          <path className="fill-s" d={ptsToPath(stoneAt(1, a))} {...F} />
          <path className="fill-s" d={ptsToPath(stoneAt(-1, a))} {...F} />
        </Live>
        {BANKING.map((p, i) => (
          <circle key={i} className="i fill-paper" cx={p[0]} cy={p[1]} r={0.11} strokeWidth={0.04} {...D} />
        ))}
        <Live id="pin">
          <circle className="fill-s" cx={pin[0]} cy={pin[1]} r={0.13} {...F} />
        </Live>
        <Jewel c={AX.pallet} r={0.2} />
        <Jewel c={AX.escape} r={0.22} />
        <Jewel c={AX.balance} r={0.24} />
      </Up>
      <Dim a={add(AX.escape, [-ESCAPE_R, 0])} b={add(AX.escape, [ESCAPE_R, 0])} off={-3.25} label={`∅ ${num(ESCAPE_R * 2, 2)}`} size={0.44} />
      <Dim a={AX.pallet} b={AX.escape} off={3.3} label={num(dist(AX.pallet, AX.escape), 2)} size={0.44} />
      <Key ch="a" size={0.62} at={[-0.7, -8.6]} to={add(AX.escape, polar(2.2, -20 * DEG))} />
      <Key ch="b" size={0.62} at={[-10.9, -7.2]} to={add(AX.pallet, rot([1.2, -0.2], a))} />
      <Key ch="c" size={0.62} at={[-8.6, -10.3]} to={stoneAt(-1, a)[1]} />
      <Key ch="d" size={0.62} at={[-6.6, -0.75]} to={add(AX.balance, polar(0.9, 50 * DEG))} />
      <Note at={add(AX.pallet, polar(6.0, REST))} size={0.46} anchor="middle">
        15°
      </Note>
      <Note at={add(AX.escape, polar(3.0, -62 * DEG))} size={0.46}>
        z 15
      </Note>
      <Note at={[cx + h - 0.55, cy + h - 0.95]} size={0.46} anchor="end">
        scala 5 : 1
      </Note>
      <LiveNote at={[cx + h - 0.55, cy + h - 1.65]} anchor="end">
        al rallentatore, 1 : 8
      </LiveNote>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ Tav. IV */

export function PlateBalance() {
  const coil = spiral(HAIRSPRING.r0, HAIRSPRING.r1, HAIRSPRING.turns, 620, 0.4);
  const stud = coil[coil.length - 1];
  const arm = 22 * DEG;
  const arc = Array.from({ length: 61 }, (_, i) => polar(6.3, (90 - 135 + (270 * i) / 60) * DEG));
  const head = (at: P2, dir: number): P2[] => [add(at, polar(0.42, dir + 2.65)), at, add(at, polar(0.42, dir - 2.65))];
  // the cock runs from its foot to the balance: seen here from the balance, it leaves the sheet
  const toFoot = angleTo(AX.balance, COCK_FOOT);
  const nrm = toFoot + Math.PI / 2;
  const curbAt = Math.atan2(stud[1], stud[0]) - 34 * DEG;
  const curb = polar(HAIRSPRING.r1 - 0.02, curbAt);
  const pinAt = polar(0.72, -68 * DEG);
  const V = 8.3;
  // Once drawn it is set swinging, at a sixth of its speed: the amplitude builds to 270 degrees each way,
  // and the spring, held at its stud, winds and unwinds about the collet.
  const svgRef = useLive((m, sec) => {
    const grow = Math.min(1, sec / 5);
    const theta = 270 * DEG * grow * grow * (3 - 2 * grow) * Math.sin((TAU * sec * 3) / 6);
    m.spin('wheel', theta, [0, 0]);
    const n = 560;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = polar(HAIRSPRING.r0 + (HAIRSPRING.r1 - HAIRSPRING.r0) * t, 0.4 + t * HAIRSPRING.turns * TAU + theta * (1 - t));
      d += `${i ? 'L' : 'M'}${p[0].toFixed(3)} ${p[1].toFixed(3)}`;
    }
    for (const el of m.all('spring')) el.setAttribute('d', d);
  });
  return (
    <PlateSvg svgRef={svgRef} viewBox={`${-V} ${-V} ${V * 2} ${V * 2}`} label="The balance at five times life size: a ten-millimetre wheel with fourteen timing screws on its rim, the hairspring of eleven and a half turns pinned at its stud, the regulator pins, and the roller with its impulse pin beneath.">
      <Up>
        <line className="c" x1={-V + 0.3} y1={0} x2={V - 0.3} y2={0} strokeWidth={0.03} {...D} />
        <line className="c" x1={0} y1={-V + 0.3} x2={0} y2={V - 0.3} strokeWidth={0.03} {...D} />
        <circle className="c" r={5.72} strokeWidth={0.03} {...D} />
        {/* the cock above, in broken line */}
        <path
          className="c"
          d={`M${polar(1.55, nrm)[0] + polar(7.4, toFoot)[0]} ${polar(1.55, nrm)[1] + polar(7.4, toFoot)[1]}L${polar(1.55, nrm)[0]} ${polar(1.55, nrm)[1]}A1.55 1.55 0 0 1 ${polar(1.55, nrm + Math.PI)[0]} ${polar(1.55, nrm + Math.PI)[1]}L${polar(1.55, nrm + Math.PI)[0] + polar(7.4, toFoot)[0]} ${polar(1.55, nrm + Math.PI)[1] + polar(7.4, toFoot)[1]}`}
          strokeWidth={0.04}
          strokeDasharray="0.2 0.14"
          {...F}
        />
        <Live id="wheel">
        <circle className="i fill-paper" r={BALANCE_R} strokeWidth={0.065} {...D} />
        <circle className="i" r={4.36} strokeWidth={0.05} {...D} />
        {[1, -1].map((sg) => (
          <g key={sg}>
            <line className="i" x1={Math.cos(arm) * 4.36 * sg} y1={Math.sin(arm) * 4.36 * sg + 0.36} x2={-Math.cos(arm) * 0.6 * sg} y2={-Math.sin(arm) * 0.6 * sg + 0.36} strokeWidth={0.05} {...D} />
            <line className="i" x1={Math.cos(arm) * 4.36 * sg} y1={Math.sin(arm) * 4.36 * sg - 0.36} x2={-Math.cos(arm) * 0.6 * sg} y2={-Math.sin(arm) * 0.6 * sg - 0.36} strokeWidth={0.05} {...D} />
          </g>
        ))}
        {/* fourteen screws: a head standing off the rim, its slot, and the thread through it */}
        {Array.from({ length: 14 }, (_, i) => {
          const deg = ((i / 14) * TAU + 0.12) / DEG;
          return (
            <g key={i} transform={`rotate(${deg})`}>
              <line className="i" x1={4.36} y1={0} x2={BALANCE_R} y2={0} strokeWidth={0.03} strokeDasharray="0.08 0.06" {...F} />
              <rect className="i fill-paper" x={BALANCE_R} y={-0.21} width={0.5} height={0.42} rx={0.06} strokeWidth={0.045} {...D} />
              <line className="i" x1={BALANCE_R + 0.5} y1={0} x2={BALANCE_R + 0.28} y2={0} strokeWidth={0.05} {...F} />
            </g>
          );
        })}
        {/* roller and impulse pin, beneath */}
        <circle className="c" r={0.84} strokeWidth={0.035} strokeDasharray="0.12 0.09" {...F} />
        <circle className="fill-s" cx={pinAt[0]} cy={pinAt[1]} r={0.13} {...F} />
        </Live>
        <path data-live="spring" className="i" d={ptsToPath(coil, false)} strokeWidth={0.04} {...D} />
        <circle className="i fill-paper" r={0.52} strokeWidth={0.05} {...D} />
        <circle className="fill-s" r={0.15} {...F} />
        {/* stud, and the two regulator pins that set the working length of the spring */}
        <rect className="i fill-paper" x={stud[0] - 0.24} y={stud[1] - 0.2} width={0.48} height={0.4} strokeWidth={0.045} transform={`rotate(${Math.atan2(stud[1], stud[0]) / DEG} ${stud[0]} ${stud[1]})`} {...D} />
        <circle className="fill-s" cx={stud[0]} cy={stud[1]} r={0.1} {...F} />
        <circle className="i fill-paper" cx={polar(HAIRSPRING.r1 + 0.12, curbAt)[0]} cy={polar(HAIRSPRING.r1 + 0.12, curbAt)[1]} r={0.085} strokeWidth={0.035} {...D} />
        <circle className="i fill-paper" cx={polar(HAIRSPRING.r1 - 0.17, curbAt)[0]} cy={polar(HAIRSPRING.r1 - 0.17, curbAt)[1]} r={0.085} strokeWidth={0.035} {...D} />
        <line className="c" x1={polar(1.12, curbAt)[0]} y1={polar(1.12, curbAt)[1]} x2={curb[0]} y2={curb[1]} strokeWidth={0.04} strokeDasharray="0.2 0.14" {...F} />
        <path className="s" d={ptsToPath(arc, false)} strokeWidth={0.04} {...D} />
        <path className="s" d={ptsToPath(head(arc[0], -45 * DEG - Math.PI / 2), false)} strokeWidth={0.04} {...D} />
        <path className="s" d={ptsToPath(head(arc[60], 225 * DEG + Math.PI / 2), false)} strokeWidth={0.04} {...D} />
      </Up>
      <Dim a={[-BALANCE_R, 0]} b={[BALANCE_R, 0]} off={-7.05} label={`∅ ${num(BALANCE_R * 2)}`} size={0.48} />
      <Key ch="a" size={0.62} at={[7.3, 5.4]} to={polar(4.7, 40 * DEG)} />
      <Key ch="b" size={0.62} at={[-7.2, 5.9]} to={polar(2.6, 138 * DEG)} />
      <Key ch="c" size={0.62} at={[7.5, -3.9]} to={polar(5.55, (12 / 14) * 360 * DEG + 0.12)} />
      <Note at={[0, 6.82]} anchor="middle" size={0.5}>
        270° per parte
      </Note>
      <Note at={[-V + 0.5, -V + 0.55]} size={0.46}>
        scala 5 : 1
      </Note>
      <Note at={[V - 0.5, -V + 0.55]} size={0.46} anchor="end">
        11 ½ spire
      </Note>
      <LiveNote at={[V - 0.5, V - 0.95]} anchor="end">
        al rallentatore, 1 : 6
      </LiveNote>
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
  const turn = (c: P2, r: number, a0: number, a1: number): P2[] => Array.from({ length: 25 }, (_, i) => add(c, polar(r, (a0 + ((a1 - a0) * i) / 24) * DEG)));
  const tip = (pts: P2[]): P2[] => {
    const e = pts[pts.length - 1];
    const d = angleTo(pts[pts.length - 3], e);
    return [add(e, polar(0.55, d + 2.6)), e, add(e, polar(0.55, d - 2.6))];
  };
  const tRatchet = turn(B, 3.7, 150, 60);
  const tCrown = turn(CW, 2.35, 250, 340);
  const clickPivot = add(clickAt, rot([-1.2, 0], 110 * DEG));
  // Once drawn, the crown is wound: a quarter turn of the ratchet at a time, the click riding over
  // each tooth and falling behind it, then a rest.
  const svgRef = useLive((m, sec) => {
    const cycle = 6.5;
    const u = Math.min(1, (sec % cycle) / 4.4);
    const phi = (Math.floor(sec / cycle) + u * u * (3 - 2 * u)) * 90 * DEG;
    const tooth = TAU / GEAR.ratchet.N;
    const ride = (phi / tooth) % 1;
    m.spin('ratchet', -phi, B);
    m.spin('crownwheel', (phi * GEAR.ratchet.N) / GEAR.crownWheel.N, CW);
    m.spin('click', -5.5 * DEG * ride, clickPivot);
    const stem = (phi * GEAR.ratchet.N) / 10;
    m.shift('flutes', 0, ((stem / (TAU / 30)) % 1) * 0.39);
    m.shift('pinion', 0, ((stem / (TAU / 10)) % 1) * 0.445);
    m.shift('sliding', 0, ((stem / (TAU / 8)) % 1) * 0.46);
  });
  return (
    <PlateSvg svgRef={svgRef} viewBox="-5.5 -15.5 31 22.6" label="The winding train from the bridge side: crown and stem, winding pinion, crown wheel of thirty-two teeth, ratchet wheel of forty-eight, and the click, above the mainspring barrel.">
      <defs>
        <clipPath id="wind-crown">
          <rect x={20.3} y={-2.25} width={2.5} height={4.5} />
        </clipPath>
        <clipPath id="wind-pinion">
          <rect x={12.2} y={-1.1} width={1.1} height={2.2} />
        </clipPath>
        <clipPath id="wind-sliding">
          <rect x={9.4} y={-0.9} width={1.7} height={1.8} />
        </clipPath>
      </defs>
      <Up>
        <path className="c" d={ptsToPath(Array.from({ length: 50 }, (_, i) => polar(PLATE_R, (-28 + i * 2.6) * DEG)), false)} strokeWidth={W.c} {...D} />
        <path className="c" d={ptsToPath(Array.from({ length: 44 }, (_, i) => polar(19.5, (-22 + i * 2.2) * DEG)), false)} strokeWidth={W.c} {...D} />
        <line className="c" x1={-5} y1={0} x2={25} y2={0} strokeWidth={W.c} {...D} />
        {/* barrel and its spring, below */}
        <path className="i fill-paper" d={ptsToPath(translatePts(gearOutline(GEAR.barrel, { phase: s.barrel }), B))} strokeWidth={W.i} {...D} />
        <circle className="i" cx={B[0]} cy={B[1]} r={6.05} strokeWidth={W.c} {...D} />
        <Mainspring c={B} phase={s.barrel} w={0.036} />
        {/* ratchet and crown wheel, above, in red chalk */}
        <Live id="ratchet">
          <path className="s" d={ptsToPath(translatePts(gearOutline(GEAR.ratchet, { phase: ratchetPhase, add: 0.8, ded: 0.9 }), B))} strokeWidth={W.s} {...D} />
          <circle className="s" cx={B[0]} cy={B[1]} r={2.6} strokeWidth={W.c} {...D} />
        </Live>
        <Live id="crownwheel">
          <path className="s" d={ptsToPath(translatePts(gearOutline(GEAR.crownWheel, { phase: angleTo(CW, B) + Math.PI / 32 + ratchetPhase * 1.5, add: 0.8, ded: 0.9 }), CW))} strokeWidth={W.s} {...D} />
          <circle className="s" cx={CW[0]} cy={CW[1]} r={1.7} strokeWidth={W.c} {...D} />
        </Live>
        <Live id="click">
          <path className="s fill-paper" d={ptsToPath(click)} strokeWidth={W.s} {...D} />
        </Live>
        <path className="s" d={`M${click[4][0]} ${click[4][1]}Q${clickAt[0] - 3.4} ${clickAt[1] + 1.2} ${clickAt[0] - 2.2} ${clickAt[1] + 4.4}`} strokeWidth={0.05} {...D} />
        <Live id="ratchet">
          <circle className="i fill-paper" cx={B[0]} cy={B[1]} r={1.05} strokeWidth={W.i} {...D} />
          <line className="i" x1={B[0] - 0.7} y1={B[1] - 0.55} x2={B[0] + 0.7} y2={B[1] + 0.55} strokeWidth={0.12} {...F} />
        </Live>
        <Live id="crownwheel">
          <circle className="i fill-paper" cx={CW[0]} cy={CW[1]} r={0.85} strokeWidth={W.i} {...D} />
          <line className="i" x1={CW[0] - 0.6} y1={CW[1] + 0.4} x2={CW[0] + 0.6} y2={CW[1] - 0.4} strokeWidth={0.12} {...F} />
        </Live>
        {/* which way they turn when the crown is wound */}
        <path className="c" d={ptsToPath(tRatchet, false)} strokeWidth={0.07} {...D} />
        <path className="c" d={ptsToPath(tip(tRatchet), false)} strokeWidth={0.07} {...D} />
        <path className="c" d={ptsToPath(tCrown, false)} strokeWidth={0.07} {...D} />
        <path className="c" d={ptsToPath(tip(tCrown), false)} strokeWidth={0.07} {...D} />
        {/* stem and crown */}
        <path className="i" d="M5.4 0.42H19.6M5.4 -0.42H19.6" strokeWidth={W.i} {...D} />
        <rect className="i fill-paper" x={9.4} y={-0.92} width={1.7} height={1.84} strokeWidth={W.i} {...D} />
        <g clipPath="url(#wind-sliding)">
          <Live id="sliding">
            <path className="i" d="M9.4 -0.92H11.1M9.4 -0.46H11.1M9.4 0H11.1M9.4 0.46H11.1" strokeWidth={W.c} {...F} />
          </Live>
        </g>
        <rect className="i fill-paper" x={12.2} y={-1.12} width={1.1} height={2.24} strokeWidth={W.i} {...D} />
        <g clipPath="url(#wind-pinion)">
          <Live id="pinion">
            <path className="i" d="M12.2 -1.115H13.3M12.2 -0.67H13.3M12.2 -0.22H13.3M12.2 0.22H13.3M12.2 0.67H13.3" strokeWidth={W.c} {...F} />
          </Live>
        </g>
        <rect className="i fill-paper" x={19.5} y={-1.7} width={0.8} height={3.4} strokeWidth={W.i} {...D} />
        <rect className="i fill-paper" x={20.3} y={-2.3} width={2.5} height={4.6} rx={0.3} strokeWidth={W.h} {...D} />
        <rect className="i fill-paper" x={22.8} y={-2.3} width={0.32} height={4.6} rx={0.1} strokeWidth={W.i} {...D} />
        <g clipPath="url(#wind-crown)">
          <Live id="flutes">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} className="i" x1={20.42} y1={-2.34 + i * 0.39} x2={22.7} y2={-2.34 + i * 0.39} strokeWidth={W.c} {...F} />
            ))}
          </Live>
        </g>
        <Pivot c={B} />
        <Pivot c={CW} />
      </Up>
      <Key ch="a" size={1.2} at={[-3.6, 13.6]} to={add(B, polar(6.9, 150 * DEG))} />
      <Key ch="b" size={1.2} at={[13.8, 13.2]} to={add(B, polar(4.9, 52 * DEG))} />
      <Key ch="c" size={1.2} at={[17.6, 6.6]} to={add(CW, polar(3.2, 40 * DEG))} />
      <Key ch="d" size={1.2} at={[24.2, -4.4]} to={[22.2, -2.4]} />
      <Key ch="e" size={1.2} at={[-4.2, 0.9]} to={clickAt} />
      <Note at={add(B, [-1.2, -3.55])} size={0.74} anchor="middle">
        z 48
      </Note>
      <Note at={add(CW, [2.9, -3.0])} size={0.74}>
        z 32
      </Note>
      <Note at={[12.75, -2.4]} size={0.74} anchor="middle">
        z 10
      </Note>
      <Note at={[-5.0, -6.3]} size={0.9}>
        30 giri di corona = 6 ¼ al bariletto = 50 ore
      </Note>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ developed section */

/** The train unrolled into one plane and cut through its arbors: dial and hands below, plate, wheels, bridges above. */
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
  const hatch = `url(#${dark ? 'hatch-d' : 'hatch'})`;
  const disc = (x: number, r: number, m: number, t = 0.16) => <rect className="i fill-paper" x={x - r} y={m - t / 2} width={r * 2} height={t} strokeWidth={0.05} {...D} />;
  const pin = (x: number, r: number, span: P2) => <rect className="i fill-paper" x={x - r} y={span[0]} width={r * 2} height={span[1] - span[0]} strokeWidth={0.05} {...D} />;
  const arbor = (x: number, m0: number, m1: number) => <line className="i" x1={x} y1={m0} x2={x} y2={m1} strokeWidth={0.07} {...D} />;
  const jewel = (x: number, m: number) => <rect key={`j${x.toFixed(2)}${m.toFixed(2)}`} className="fill-s" x={x - 0.42} y={m - 0.2} width={0.84} height={0.4} rx={0.06} {...F} />;
  const endstone = (x: number, m: number) => <rect key={`e${x.toFixed(2)}${m.toFixed(2)}`} className="fill-s" x={x - 0.3} y={m - 0.1} width={0.6} height={0.2} rx={0.05} {...F} />;
  const x0 = -8.6;
  const x1 = xBal + 6.8;
  const P = PLATE_T;
  // the spring cut across: one line for each turn, either side of the arbor
  const coils = Math.round(MAINSPRING.turns) * 2;
  const lip = 4.3;
  const floor = 4.14;
  const names: [number, string, number][] = [
    [xB, 'bariletto', 0],
    [xC, 'centro', 0],
    [xT, 'mediana', 0],
    [xF, 'secondi', 0],
    [xE, 'scappamento', 0],
    [xP, 'àncora', 0.72],
    [xBal, 'bilanciere', 0],
  ];
  return (
    <PlateSvg mode="scrub" className={dark ? 'on-dark' : ''} viewBox={`${x0 - 1.5} -5.3 ${x1 - x0 + 2.5} 11.2`} label="Developed cross-section of the Calibro V.31: dial and hands below the mainplate, every arbor of the train between the plate and its bridges, and the jewels they turn in.">
      <defs>
        <pattern id={dark ? 'hatch-d' : 'hatch'} width="0.34" height="0.34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.34" stroke={dark ? '#cdbf9f' : '#4a3423'} strokeWidth="0.035" />
        </pattern>
      </defs>
      {/* heights are measured from the plate towards the bridges and drawn upwards */}
      <g transform="scale(1,-1)">
        {/* dial, with the seconds sunk into it, and the hands beneath */}
        <path className="i fill-paper" d={`M${x0} ${-P}H${x1}V${-P - 0.4}H${xF + lip}L${xF + floor} ${-P - 0.1}H${xF - floor}L${xF - lip} ${-P - 0.4}H${x0}Z`} strokeWidth={0.05} {...D} />
        <rect className="i fill-paper" x={xC - 14.7} y={-P - 1.48} width={15.65} height={0.24} strokeWidth={0.045} {...D} />
        <rect className="i fill-paper" x={xC - 1.2} y={-P - 1.17} width={11.1} height={0.25} strokeWidth={0.045} {...D} />
        <rect className="i fill-paper" x={xF - 1.25} y={-P - 0.6} width={4.87} height={0.1} strokeWidth={0.04} {...D} />
        {/* mainplate, bridges and cock, in section */}
        <rect x={x0} y={-P} width={x1 - x0} height={P} fill={hatch} {...F} />
        <rect className="i" x={x0} y={-P} width={x1 - x0} height={P} strokeWidth={0.07} {...D} />
        <rect x={x0} y={LV.bridge[0]} width={xE + 1.6 - x0} height={LV.bridge[1] - LV.bridge[0]} fill={hatch} {...F} />
        <rect className="i" x={x0} y={LV.bridge[0]} width={xE + 1.6 - x0} height={LV.bridge[1] - LV.bridge[0]} strokeWidth={0.07} {...D} />
        <rect x={xBal - 1.6} y={LV.cock[0]} width={x1 - (xBal - 1.6)} height={LV.cock[1] - LV.cock[0]} fill={hatch} {...F} />
        <path className="i" d={`M${xBal - 1.6} ${LV.cock[0]}H${x1 - 2.4}V0H${x1}V${LV.cock[1]}H${xBal - 1.6}Z`} strokeWidth={0.07} {...D} />
        <rect className="i fill-paper" x={xP - 0.7} y={LV.palletBridge[0]} width={2.6} height={LV.palletBridge[1] - LV.palletBridge[0]} strokeWidth={0.05} {...D} />
        {/* barrel: drum, spring in section, arbor, and the ratchet wheel above the bridge */}
        <path className="i fill-paper" d={`M${xB - 6.42} ${LV.barrel[0] + 0.1}V${LV.barrelTeeth[0]}H${xB - 6.95}V${LV.barrel[1]}H${xB + 6.95}V${LV.barrelTeeth[0]}H${xB + 6.42}V${LV.barrel[0] + 0.1}Z`} strokeWidth={0.06} {...D} />
        {Array.from({ length: coils + 1 }, (_, i) => {
          const x = xB - MAINSPRING.r1 + (i * MAINSPRING.r1 * 2) / coils;
          if (Math.abs(x - xB) < MAINSPRING.r0) return null;
          return <line key={i} className="i" x1={x} y1={0.36} x2={x} y2={1.16} strokeWidth={0.045} {...D} />;
        })}
        {pin(xB, 1.15, [0.22, 1.55])}
        {arbor(xB, -P + 0.3, LV.keyless[1])}
        {disc(xB, pitchR(GEAR.ratchet), (LV.keyless[0] + LV.keyless[1]) / 2, 0.27)}
        {/* centre, third, fourth, escape */}
        {arbor(xC, -P - 1.86, LV.bridge[0] + 0.3)}
        {pin(xC, 0.56, [-P - 1.66, -P - 0.4])}
        {pin(xC, 0.85, LV.centrePinion)}
        {disc(xC, pitchR(GEAR.centreWheel), LV.centreWheel)}
        {arbor(xT, -0.3, LV.bridge[0] + 0.3)}
        {pin(xT, 0.64, LV.thirdPinion)}
        {disc(xT, pitchR(GEAR.thirdWheel), LV.thirdWheel)}
        {arbor(xF, -P - 0.74, LV.bridge[0] + 0.3)}
        {pin(xF, 0.52, LV.fourthPinion)}
        {disc(xF, pitchR(GEAR.fourthWheel), LV.fourthWheel)}
        {arbor(xE, -0.3, LV.bridge[0] + 0.3)}
        {pin(xE, 0.33, LV.escapePinion)}
        {disc(xE, ESCAPE_R, LV.escapeWheel, 0.12)}
        {/* lever and balance */}
        {arbor(xP, -0.3, LV.palletBridge[0] + 0.2)}
        {disc(xP + 0.7, 2.0, LV.pallet, 0.14)}
        {arbor(xBal, -0.3, LV.cock[0] + 0.3)}
        {disc(xBal, 0.84, (LV.roller[0] + LV.roller[1]) / 2, 0.2)}
        {disc(xBal, BALANCE_R, (LV.balanceRim[0] + LV.balanceRim[1]) / 2, 0.35)}
        {disc(xBal, HAIRSPRING.r1, (LV.hairspring[0] + LV.hairspring[1]) / 2, 0.14)}
        {/* sixteen of the nineteen jewels lie in this plane */}
        {[xB, xC, xT, xF, xE].map((x) => jewel(x, LV.bridge[0] + 0.32))}
        {[xB, xC, xT, xF, xE, xP, xBal].map((x) => jewel(x, -0.22))}
        {jewel(xBal, LV.cock[0] + 0.25)}
        {jewel(xP, LV.palletBridge[0] + 0.13)}
        {endstone(xBal, LV.cock[0] + 0.25 + 0.34)}
        {endstone(xBal, -0.22 - 0.34)}
      </g>
      {names.map(([x, t, dy]) => (
        <text key={t} {...F} className="halo" x={x} y={P + 2.75 + dy} fontSize={0.56} textAnchor="middle">
          {t}
        </text>
      ))}
      <text {...F} className="halo" x={xB} y={-LV.keyless[1] - 0.42} fontSize={0.5} textAnchor="middle">
        rocchetto
      </text>
      <text {...F} className="halo" x={(xT + xF) / 2} y={-LV.bridge[1] - 0.36} fontSize={0.5} textAnchor="middle">
        ponte del treno
      </text>
      <text {...F} className="halo" x={xBal + 3.1} y={-LV.cock[1] - 0.36} fontSize={0.5} textAnchor="middle">
        ponte del bilanciere
      </text>
      <text {...F} className="halo" x={x1 - 0.5} y={P / 2 + 0.16} fontSize={0.5} textAnchor="end">
        platina
      </text>
      <text {...F} className="halo" x={x1 - 0.5} y={P + 1.05} fontSize={0.5} textAnchor="end">
        quadrante
      </text>
      <text {...F} className="halo" x={xC - 11.6} y={P + 2.05} fontSize={0.5} textAnchor="middle">
        lancette
      </text>
      <text {...F} className="halo" x={x1} y={P + 3.72} fontSize={0.5} textAnchor="end">
        19 rubini: sedici in sezione, due levée, un’ellisse
      </text>
      <g {...F}>
        <line className="s" x1={x0 - 0.6} y1={P} x2={x0 - 0.6} y2={-LV.cock[1]} strokeWidth={0.045} />
        <line className="s" x1={x0 - 0.9} y1={P} x2={x0 - 0.3} y2={P} strokeWidth={0.045} />
        <line className="s" x1={x0 - 0.9} y1={-LV.cock[1]} x2={x0 - 0.3} y2={-LV.cock[1]} strokeWidth={0.045} />
      </g>
      <text {...F} className="dim" x={x0 - 0.6} y={-LV.cock[1] - 0.42} fontSize={0.44} textAnchor="middle">
        {num(CALIBRE_HEIGHT)}
      </text>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ finishing, in section */

/** A written note with a fine line to what it is about. */
const Call = ({ at, to, children, anchor = 'start', size = 0.24 }: { at: P2; to: P2; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number }) => (
  <g {...F}>
    <line className="c" x1={to[0]} y1={-to[1]} x2={at[0]} y2={-at[1] + size * 0.45} strokeWidth={size * 0.07} />
    <text className="halo" x={at[0]} y={-at[1]} fontSize={size} textAnchor={anchor}>
      {children}
    </text>
  </g>
);

/**
 * What the finishing is, cut through a bridge at forty times life size: the bevel along the edge,
 * the stripes on the face, a jewel in its gold setting and a blued screw in its polished sink.
 */
export function PlateFinish({ dark = false }: { dark?: boolean }) {
  const t = LV.bridge[1] - LV.bridge[0];
  const b = 0.17;
  const xL = -4.5;
  const xR = 4.6;
  const xj = -1.85;
  const rj = 0.5;
  const rc = rj + 0.34;
  const rh = rj + 0.38;
  const xs = 2.15;
  const rs = 0.7;
  const ro = 0.8;
  const pitch = 1.43;
  const top = (xa: number, xb: number): string => {
    const n = Math.max(2, Math.round(Math.abs(xb - xa) / 0.06));
    let d = '';
    for (let i = 0; i <= n; i++) {
      const x = xa + ((xb - xa) * i) / n;
      d += `L${x.toFixed(3)} ${(t + 0.045 * Math.abs(Math.sin((Math.PI * (x - xL)) / pitch))).toFixed(3)}`;
    }
    return d;
  };
  const A = `M${xL + b} 0L${xj - rh - b} 0L${xj - rh} ${b}L${xj - rh} ${t - b}L${xj - rh - b} ${t}${top(xj - rh - b, xL + b)}L${xL} ${t - b}L${xL} ${b}Z`;
  const sh = 0.36; // how deep the head sits
  const cl = 0.36; // clearance hole for the shank
  const B = `M${xj + rh + b} 0L${xs - cl} 0L${xs - cl} ${t - sh}L${xs - ro} ${t - sh}L${xs - ro} ${t - b}L${xs - ro - b} ${t}${top(xs - ro - b, xj + rh + b)}L${xj + rh} ${t - b}L${xj + rh} ${b}Z`;
  const C = `M${xs + cl} 0L${xR} 0L${xR - 0.12} ${t * 0.3}L${xR + 0.1} ${t * 0.55}L${xR} ${t}${top(xR, xs + ro + b)}L${xs + ro} ${t - b}L${xs + ro} ${t - sh}L${xs + cl} ${t - sh}Z`;
  const bevels = `M${xL} ${t - b}L${xL + b} ${t}M${xj - rh - b} ${t}L${xj - rh} ${t - b}M${xj + rh} ${t - b}L${xj + rh + b} ${t}M${xs - ro - b} ${t}L${xs - ro} ${t - b}M${xs + ro} ${t - b}L${xs + ro + b} ${t}`;
  const id = dark ? 'hatch-fd' : 'hatch-f';
  const hatch = `url(#${id})`;
  const ruby = (sg: number) => `M${xj + sg * rj} 0.1V${t - 0.03}Q${xj + sg * 0.3} ${t - 0.04} ${xj + sg * 0.11} ${t - 0.24}V0.1Z`;
  return (
    <PlateSvg mode="scrub" className={dark ? 'on-dark' : ''} viewBox="-5.9 -2.55 11.6 4.5" label="Section through a bridge at forty times life size: the forty-five degree bevel along its edge, the stripes on its face, a ruby in its gold setting and a blued screw seated in a polished sink.">
      <defs>
        <pattern id={id} width="0.11" height="0.11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.11" stroke={dark ? '#cdbf9f' : '#4a3423'} strokeWidth="0.012" />
        </pattern>
        <pattern id={`${id}-p`} width="0.16" height="0.16" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="0.16" stroke={dark ? '#cdbf9f' : '#4a3423'} strokeWidth="0.01" />
        </pattern>
      </defs>
      <Up>
        {/* the pillar of the plate the screw goes into */}
        <path d={`M${xs - 1.5} 0H${xs + 1.5}V-1.25L${xs + 0.9} -1.38L${xs + 0.2} -1.2L${xs - 0.7} -1.4L${xs - 1.5} -1.25Z`} fill={`url(#${id}-p)`} {...F} />
        <path className="i" d={`M${xs - 1.5} -1.25V0H${xs + 1.5}V-1.25`} strokeWidth={0.02} {...D} />
        {/* the bridge */}
        {[A, B, C].map((d, i) => (
          <g key={i}>
            <path d={d} fill={hatch} {...F} />
            <path className="i" d={d} strokeWidth={0.024} {...D} />
          </g>
        ))}
        {/* every polished face, in red chalk */}
        <path className="s" d={bevels} strokeWidth={0.05} {...D} />
        {/* jewel: gold setting, ruby with its oil sink, and the pivot turning in it */}
        {[1, -1].map((sg) => (
          <g key={sg}>
            <path className="i fill-paper" d={`M${xj + sg * rj} 0.14H${xj + sg * rc}V${t + 0.015}H${xj + sg * rj}Z`} strokeWidth={0.02} {...D} />
            <path className="fill-s" d={ruby(sg)} {...F} />
          </g>
        ))}
        <path className="i fill-paper" d={`M${xj - 0.27} -1.3V-0.12L${xj - 0.1} 0V${t - 0.3}H${xj + 0.1}V0L${xj + 0.27} -0.12V-1.3`} strokeWidth={0.02} {...D} />
        <line className="c" x1={xj} y1={-1.5} x2={xj} y2={t + 0.5} strokeWidth={0.012} strokeDasharray="0.12 0.05 0.03 0.05" {...F} />
        {/* screw: head, slot, shank and thread */}
        <path
          className="i fill-paper"
          d={`M${xs - rs} ${t - sh}V${t + 0.03}L${xs - rs + 0.07} ${t + 0.1}H${xs - 0.085}V${t - 0.07}H${xs + 0.085}V${t + 0.1}H${xs + rs - 0.07}L${xs + rs} ${t + 0.03}V${t - 0.36}H${xs + 0.3}V-1.02L${xs + 0.22} -1.1H${xs - 0.22}L${xs - 0.3} -1.02V${t - 0.36}Z`}
          strokeWidth={0.024}
          {...D}
        />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="i" x1={xs - 0.3} y1={-0.08 - i * 0.11} x2={xs + 0.3} y2={-0.13 - i * 0.11} strokeWidth={0.012} {...F} />
        ))}
        <line className="c" x1={xs} y1={-1.5} x2={xs} y2={t + 0.5} strokeWidth={0.012} strokeDasharray="0.12 0.05 0.03 0.05" {...F} />
      </Up>
      <Dim a={[xL, 0]} b={[xL, t]} off={0.82} label={num(t, 2)} size={0.2} />
      <Dim a={[xL, t]} b={[xL + b, t]} off={0.42} label={num(b, 2)} size={0.17} gap={0.75} />
      <Dim a={[xL + 3 * pitch, t + 0.05]} b={[xL + 4 * pitch, t + 0.05]} off={0.36} label={`passo ${num(pitch, 2)}`} size={0.17} gap={0.75} />
      <Call at={[-5.75, 1.62]} to={[xL + b / 2, t - b / 2]}>
        smusso a 45°, lucidato a specchio
      </Call>
      <Call at={[-5.75, -1.0]} to={[xj - 0.67, 0.2]}>
        rubino nel suo castone d’oro
      </Call>
      <Call at={[0.5, 1.62]} to={[0.3, t + 0.06]} anchor="middle">
        côtes
      </Call>
      <Call at={[xs, 1.62]} to={[xs + 0.4, t + 0.1]} anchor="middle">
        vite azzurrata
      </Call>
      <Call at={[5.55, 1.2]} to={[xs + ro + b / 2, t - b / 2]} anchor="end">
        svasatura lucidata
      </Call>
      <Call at={[5.55, -1.0]} to={[xs + 1.2, -0.7]} anchor="end">
        platina
      </Call>
      <Note at={[-5.7, -1.75]} size={0.2}>
        scala 40 : 1
      </Note>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ case plates for the collection */

const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/** The right-hand edge of a feuille hand mirrored into a closed outline: the same curve the 3D hands are filed to. */
function leafOutline(L: number, Wd: number): P2[] {
  const n = 22;
  const right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    right.push([Wd * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.9) + 0.16 * (1 - t), 0.5 + (L - 0.5) * t]);
  }
  return [...right, ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y] as P2)];
}
const swordOutline = (L: number, w: number): P2[] => [[-w * 0.55, -1.7], [w * 0.55, -1.7], [w, L - 2.6], [0, L], [-w, L - 2.6]];
const batonOutline = (L: number, w: number): P2[] => [[-w * 0.62, -1.9], [w * 0.62, -1.9], [w * 0.62, L], [-w * 0.62, L]];

export function PlateCase({ spec }: { spec: WatchSpec }) {
  const R = spec.diameter / 2;
  const k = R / 19.5;
  const L = spec.lugToLug / 2;
  const lw = spec.lugWidth / 2;
  const T = spec.thickness;
  const kt = T / 10.5;
  const ex = R + 15; // where the elevation stands
  const zTop = T / 2;
  const zBot = -T / 2;
  const diver = spec.bezel === 'dive';
  const gmt = spec.bezel === 'gmt';
  const style = spec.dial.style;
  const dimY = -(L + 5.2);
  const lugW = 2.3 * k;
  const lug = (sx: number, sy: number) =>
    `M${sx * lw} ${sy * Math.sqrt(R * R - lw * lw) * 0.985}L${sx * lw} ${sy * (L - 0.4)}Q${sx * lw} ${sy * L} ${sx * (lw + 0.4)} ${sy * L}L${sx * (lw + lugW - 0.4)} ${sy * L}Q${sx * (lw + lugW)} ${sy * L} ${sx * (lw + lugW)} ${sy * (L - 0.4)}L${sx * (lw + lugW)} ${sy * Math.sqrt(Math.max(0, R * R - (lw + lugW) ** 2)) * 0.985}`;
  // a point on the dial, by the clock: `deg` clockwise from twelve
  const at = (r: number, deg: number): P2 => polar(r * k, (90 - deg) * DEG);
  const hand = (pts: P2[], deg: number) => ptsToPath(pts.map((p) => rot([p[0] * k, p[1] * k], -deg * DEG)));
  const hourDeg = 304.3;
  const minDeg = 51.6;
  const shape = spec.hands === 'leaf' ? leafOutline : spec.hands === 'sword' ? swordOutline : batonOutline;
  const bar = (r0: number, r1: number, w: number, deg: number, off = 0) =>
    ptsToPath(([[-w / 2 + off, r0], [w / 2 + off, r0], [w / 2 + off, r1], [-w / 2 + off, r1]] as P2[]).map((p) => rot([p[0] * k, p[1] * k], -deg * DEG)));
  const numeral = (text: string, r: number, deg: number, size: number, flip = false) => {
    const p = at(r, deg);
    return (
      <text key={`${text}${deg}`} {...F} className="num" x={p[0]} y={-p[1]} fontSize={size * k} textAnchor="middle" dominantBaseline="central" transform={`rotate(${deg + (flip ? 180 : 0)} ${p[0]} ${-p[1]})`}>
        {text}
      </text>
    );
  };
  // elevation: the real profile of the case, x along the thickness, y across
  const tx = ex + 1.73 * kt;
  const ez = (z: number) => z * kt;
  const lugY = (y: number) => R + ((y - 19.5) * (L - R)) / (23.4 - 19.5);
  const half = (sy: number) =>
    [
      `M${ez(-6.98)} ${sy * 17.4 * k}L${ez(-6.38)} ${sy * 18.5 * k}L${ez(-5.6)} ${sy * 18.5 * k}`,
      `M${ez(-5.6)} ${sy * 18.6 * k}L${ez(-4.7)} ${sy * R}L${ez(0.6)} ${sy * R}L${ez(1.3)} ${sy * 18.9 * k}`,
      `M${ez(1.3)} ${sy * 19.3 * k}L${ez(1.5)} ${sy * 19.3 * k}L${ez(2.36)} ${sy * 18.5 * k}L${ez(2.6)} ${sy * 17.5 * k}L${ez(2.88)} ${sy * 16.98 * k}`,
      `M${ez(0.9)} ${sy * lugY(19.4)}Q${ez(0.5)} ${sy * lugY(20.9)} ${ez(-1.5)} ${sy * lugY(22.3)}T${ez(-4.9)} ${sy * L}L${ez(-5.5)} ${sy * (L - 0.5)}L${ez(-5.6)} ${sy * R * 0.955}`,
    ].join('');
  // once drawn, the hands leave ten past ten for the hour it actually is, and keep it
  const to = useRef(follower()).current;
  const svgRef = useLive((m, _sec, e) => {
    const n = trainAt(clockNow());
    m.spin('hour', to('hour', n.hour, -hourDeg * DEG, e), [0, 0]);
    m.spin('minute', to('minute', n.minute, -minDeg * DEG, e), [0, 0]);
    m.spin('seconds', to('seconds', n.second, -219 * DEG, e), [0, 0]);
    m.spin('small', to('small', n.second, -218 * DEG, e), [0, -8.6 * k]);
    m.spin('gmt', to('gmt', n.hour / 2 - 1.9, -261 * DEG, e), [0, 0]);
  });
  const edges = [-5.6, -4.7, 0.6, 1.3, 2.36, 2.88]
    .map((z) => {
      const y = z <= -5.6 ? 18.5 * k : z <= 0.6 ? R : z <= 1.3 ? 18.9 * k : z <= 2.36 ? 18.5 * k : 16.98 * k;
      return `M${ez(z)} ${-y}V${y}`;
    })
    .join('');
  return (
    <PlateSvg svgRef={svgRef} viewBox={`${-R - 9} ${-L - 9.5} ${R * 2 + 38} ${L * 2 + 18}`} label={`Plan and side elevation of the ${spec.name}, with its dial, hands and principal dimensions.`}>
      <Up>
        {/* construction */}
        <line className="c" x1={-R - 7} y1={0} x2={ex + T} y2={0} strokeWidth={0.09} {...D} />
        <line className="c" x1={0} y1={-L - 6} x2={0} y2={L + 6} strokeWidth={0.09} {...D} />
        <circle className="c" r={R * 1.27} strokeWidth={0.09} {...D} />
        <line className="c" x1={-R} y1={L} x2={ex + zTop + 3} y2={L} strokeWidth={0.07} {...D} />
        <line className="c" x1={-R} y1={-L} x2={ex + zTop + 3} y2={-L} strokeWidth={0.07} {...D} />
        {/* plan: case, bezel, crystal, the opening of the dial */}
        <circle className="i" r={R} strokeWidth={0.2} {...D} />
        <circle className="i" r={(diver ? 19.2 : gmt ? 19.02 : 18.5) * k} strokeWidth={0.1} {...D} />
        <circle className="i" r={16.96 * k} strokeWidth={0.13} {...D} />
        <circle className="i" r={16.0 * k} strokeWidth={0.1} {...D} />
        {[1, -1].map((sx) => [1, -1].map((sy) => <path key={`${sx}${sy}`} className="i" d={lug(sx, sy)} strokeWidth={0.18} {...D} />))}
        {[1, -1].map((sy) => (
          <line key={sy} className="i" x1={-lw} y1={sy * (L - 2.2 * k)} x2={lw} y2={sy * (L - 2.2 * k)} strokeWidth={0.1} strokeDasharray="0.7 0.5" {...F} />
        ))}
        {/* crown, fluted */}
        <rect className="i" x={R + 0.2} y={-1.7 * k} width={0.75 * k} height={3.4 * k} strokeWidth={0.14} {...D} />
        <rect className="i" x={R + 0.95 * k} y={-2.3 * k} width={2.6 * k} height={4.6 * k} rx={0.3} strokeWidth={0.18} {...D} />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} className="i" x1={R + 1.15 * k} y1={(-1.74 + i * 0.58) * k} x2={R + 3.35 * k} y2={(-1.74 + i * 0.58) * k} strokeWidth={0.07} {...F} />
        ))}
        {spec.crownGuards && <path className="i" d={`M${R * 0.94} ${5.6 * k}L${R + 2.4} ${3.9 * k}L${R + 2.9} ${2.7 * k}M${R * 0.94} ${-5.6 * k}L${R + 2.4} ${-3.9 * k}L${R + 2.9} ${-2.7 * k}`} strokeWidth={0.18} {...D} />}
        {/* the dial, each as it is made */}
        {style === 'sector' && (
          <g>
            <circle className="i" r={15.86 * k} strokeWidth={0.06} {...D} />
            <circle className="i" r={15.1 * k} strokeWidth={0.06} {...D} />
            <circle className="i" r={14.7 * k} strokeWidth={0.1} {...D} />
            <circle className="i" r={11.35 * k} strokeWidth={0.1} {...D} />
            <circle className="i" r={4.7 * k} strokeWidth={0.06} {...D} />
            {Array.from({ length: 60 }, (_, i) => (
              <line key={i} className="i" x1={at(15.1, i * 6)[0]} y1={at(15.1, i * 6)[1]} x2={at(15.86, i * 6)[0]} y2={at(15.86, i * 6)[1]} strokeWidth={i % 5 === 0 ? 0.16 : 0.05} {...F} />
            ))}
            {Array.from({ length: 12 }, (_, h) =>
              h === 0 || h === 6 ? null : <line key={h} className="i" x1={at(4.7, h * 30)[0]} y1={at(4.7, h * 30)[1]} x2={at(11.35, h * 30)[0]} y2={at(11.35, h * 30)[1]} strokeWidth={0.06} {...D} />,
            )}
            {[0, 90, 270].map((d) => (
              <line key={d} className="i" x1={at(0.9, d)[0]} y1={at(0.9, d)[1]} x2={at(4.7, d)[0]} y2={at(4.7, d)[1]} strokeWidth={0.06} {...D} />
            ))}
            {[1, 3, 5, 7, 9, 11].map((h) => (
              <path key={h} className="i fill-paper" d={bar(11.95, 14.12, 0.5, h * 30)} strokeWidth={0.07} {...D} />
            ))}
            {/* the seconds, sunk: lip, floor, and their own track */}
            <circle className="i fill-paper" cx={0} cy={-8.6 * k} r={4.3 * k} strokeWidth={0.12} {...D} />
            <circle className="i" cx={0} cy={-8.6 * k} r={4.14 * k} strokeWidth={0.05} {...D} />
            <circle className="i" cx={0} cy={-8.6 * k} r={3.48 * k} strokeWidth={0.05} {...D} />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * TAU;
              return <line key={i} className="i" x1={Math.cos(a) * 3.15 * k} y1={-8.6 * k + Math.sin(a) * 3.15 * k} x2={Math.cos(a) * 3.96 * k} y2={-8.6 * k + Math.sin(a) * 3.96 * k} strokeWidth={0.07} {...F} />;
            })}
            <Live id="small">
              <line className="s" x1={0} y1={(-8.6 + 1.25) * k} x2={0} y2={(-8.6 - 3.62) * k} strokeWidth={0.12} transform={`rotate(-38 0 ${-8.6 * k})`} {...D} />
            </Live>
            <circle className="fill-s" cx={0} cy={-8.6 * k} r={0.34 * k} {...F} />
          </g>
        )}
        {style === 'classic' && (
          <g>
            {Array.from({ length: 60 }, (_, i) => (
              <circle key={i} className="fill-i" cx={at(15.3, i * 6)[0]} cy={at(15.3, i * 6)[1]} r={(i % 5 === 0 ? 0.2 : 0.1) * k} {...F} />
            ))}
            {Array.from({ length: 11 }, (_, i) => {
              const h = i + 1;
              const hl = h % 3 === 0 ? 1.55 : 1.25;
              return <path key={h} className="i fill-paper" d={bar(12.55 - hl, 12.55 + hl, 0.54, h * 30)} strokeWidth={0.07} {...D} />;
            })}
          </g>
        )}
        {style === 'diver' && (
          <g>
            {Array.from({ length: 120 }, (_, i) => {
              const a = (i / 120) * TAU;
              return <line key={i} className="i" x1={Math.cos(a) * (R - 0.15)} y1={Math.sin(a) * (R - 0.15)} x2={Math.cos(a) * (R + 0.4)} y2={Math.sin(a) * (R + 0.4)} strokeWidth={0.09} {...F} />;
            })}
            {Array.from({ length: 16 }, (_, i) => (
              <line key={i} className="i" x1={at(18.2, i * 6)[0]} y1={at(18.2, i * 6)[1]} x2={at(18.8, i * 6)[0]} y2={at(18.8, i * 6)[1]} strokeWidth={0.1} {...F} />
            ))}
            <path className="s" d={ptsToPath([at(16.8, 0), [at(18.75, 0)[0] + 1.25 * k, at(18.75, 0)[1]], [at(18.75, 0)[0] - 1.25 * k, at(18.75, 0)[1]]])} strokeWidth={0.1} {...D} />
            {Array.from({ length: 60 }, (_, i) => (
              <line key={i} className="i" x1={at(14.9, i * 6)[0]} y1={at(14.9, i * 6)[1]} x2={at(15.9, i * 6)[0]} y2={at(15.9, i * 6)[1]} strokeWidth={0.07} {...F} />
            ))}
            {Array.from({ length: 12 }, (_, h) => {
              const c = at(12.4, h * 30);
              if (h === 0) return <path key={h} className="i fill-paper" d={ptsToPath([at(10.9, 0), [c[0] + 1.45 * k, at(13.7, 0)[1]], [c[0] - 1.45 * k, at(13.7, 0)[1]]])} strokeWidth={0.09} {...D} />;
              if (h % 3 === 0) return <path key={h} className="i fill-paper" d={bar(10.9, 13.9, 1.24, h * 30)} strokeWidth={0.09} {...D} />;
              return <circle key={h} className="i fill-paper" cx={c[0]} cy={c[1]} r={0.98 * k} strokeWidth={0.09} {...D} />;
            })}
          </g>
        )}
        {style === 'gmt' && (
          <g>
            <circle className="i" r={14.75 * k} strokeWidth={0.06} {...D} />
            <circle className="i" r={8.9 * k} strokeWidth={0.05} {...D} />
            {Array.from({ length: 60 }, (_, i) => (
              <line key={i} className="i" x1={at(14.75, i * 6)[0]} y1={at(14.75, i * 6)[1]} x2={at(i % 5 === 0 ? 15.9 : 15.5, i * 6)[0]} y2={at(i % 5 === 0 ? 15.9 : 15.5, i * 6)[1]} strokeWidth={i % 5 === 0 ? 0.16 : 0.06} {...F} />
            ))}
            {Array.from({ length: 24 }, (_, i) => (
              <line key={i} className="i" x1={at(8.9, i * 15)[0]} y1={at(8.9, i * 15)[1]} x2={at(9.35, i * 15)[0]} y2={at(9.35, i * 15)[1]} strokeWidth={0.05} {...F} />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <circle key={i} className="fill-i" cx={at(18.0, i * 30 + 15)[0]} cy={at(18.0, i * 30 + 15)[1]} r={0.24 * k} {...F} />
            ))}
            {Array.from({ length: 12 }, (_, h) => {
              const hl = h % 3 === 0 ? 1.55 : 1.25;
              if (h === 0) return [0.42, -0.42].map((o) => <path key={o} className="i fill-paper" d={bar(12.55 - hl, 12.55 + hl, 0.54, 0, o)} strokeWidth={0.07} {...D} />);
              return <path key={h} className="i fill-paper" d={bar(12.55 - hl, 12.55 + hl, 0.54, h * 30)} strokeWidth={0.07} {...D} />;
            })}
          </g>
        )}
        {/* hands, in red chalk, at eight minutes past ten */}
        {spec.gmtHand && (
          <Live id="gmt">
            <path className="s" d={hand([[-0.16, -1.4], [0.16, -1.4], [0.16, 11.1], [0.95, 11.1], [0, 13.4], [-0.95, 11.1], [-0.16, 11.1]], 261)} strokeWidth={0.1} {...D} />
          </Live>
        )}
        <Live id="hour">
          <path className="s fill-paper" d={hand(shape(spec.hands === 'leaf' ? 9.9 : 9.6, 1.02), hourDeg)} strokeWidth={0.12} {...D} />
        </Live>
        <Live id="minute">
          <path className="s fill-paper" d={hand(shape(spec.hands === 'leaf' ? 14.7 : 14.3, 0.78), minDeg)} strokeWidth={0.12} {...D} />
        </Live>
        {spec.seconds === 'centre' && (
          <Live id="seconds">
            <line className="s" x1={at(-4.2, 219)[0]} y1={at(-4.2, 219)[1]} x2={at(15.4, 219)[0]} y2={at(15.4, 219)[1]} strokeWidth={0.09} {...D} />
            {diver && <circle className="s fill-paper" cx={at(10.4, 219)[0]} cy={at(10.4, 219)[1]} r={0.82 * k} strokeWidth={0.09} {...D} />}
          </Live>
        )}
        <circle className="s fill-paper" r={0.95 * k} strokeWidth={0.1} {...D} />
        <circle className="fill-s" r={0.3 * k} {...F} />
        {/* elevation, seen from the crown */}
        <g transform={`translate(${tx} 0)`}>
          <path className="i" d={`${half(1)}${half(-1)}M${ez(-6.98)} ${-17.4 * k}V${17.4 * k}`} strokeWidth={0.17} {...D} />
          <path className="i" d={edges} strokeWidth={0.08} {...D} />
          <path className="i" d={`M${ez(2.72)} ${16.72 * k}Q${ez(diver ? 3.5 : 4.32)} 0 ${ez(2.72)} ${-16.72 * k}`} strokeWidth={0.11} {...D} />
          <circle className="i fill-paper" cx={ez(-1.2)} cy={0} r={2.3 * k} strokeWidth={0.17} {...D} />
          <circle className="i" cx={ez(-1.2)} cy={0} r={1.55 * k} strokeWidth={0.08} {...D} />
          {Array.from({ length: 30 }, (_, i) => {
            const a = (i / 30) * TAU;
            return <line key={i} className="i" x1={ez(-1.2) + Math.cos(a) * 1.9 * k} y1={Math.sin(a) * 1.9 * k} x2={ez(-1.2) + Math.cos(a) * 2.3 * k} y2={Math.sin(a) * 2.3 * k} strokeWidth={0.06} {...F} />;
          })}
        </g>
        {/* dimensions in red chalk */}
        <path className="s" d={`M${-R} ${-dimY}H${R}M${-R} ${-dimY - 1}V${-dimY + 1}M${R} ${-dimY - 1}V${-dimY + 1}`} strokeWidth={0.12} {...D} />
        <path className="s" d={`M${ex + zTop + 3.6} ${-L}V${L}M${ex + zTop + 2.6} ${-L}H${ex + zTop + 4.6}M${ex + zTop + 2.6} ${L}H${ex + zTop + 4.6}`} strokeWidth={0.12} {...D} />
        <path className="s" d={`M${ex + zBot} ${-L - 3.6}H${ex + zTop}M${ex + zBot} ${-L - 4.6}V${-L - 2.6}M${ex + zTop} ${-L - 4.6}V${-L - 2.6}`} strokeWidth={0.12} {...D} />
        <path className="s" d={`M${-lw} ${-L - 3.6}H${lw}M${-lw} ${-L - 4.6}V${-L - 2.6}M${lw} ${-L - 4.6}V${-L - 2.6}`} strokeWidth={0.12} {...D} />
      </Up>
      {/* lettering on the dial and bezel */}
      {style === 'sector' && [0, 2, 4, 8, 10].map((h) => numeral(ROMAN[h], 13.02, h * 30, h === 0 ? 2.3 : 2.05, h > 3 && h < 9))}
      {style === 'classic' && numeral('XII', 12.3, 0, 2.9)}
      {diver && [10, 20, 30, 40, 50].map((m) => numeral(String(m), 17.75, m * 6, 1.7))}
      {gmt && Array.from({ length: 12 }, (_, i) => numeral(String(i === 0 ? 24 : i * 2), 18.0, i * 30, 1.45))}
      <text {...F} className="dim" x={0} y={dimY - 1.3} fontSize={2.1} textAnchor="middle">
        ∅ {String(spec.diameter).replace('.', ',')}
      </text>
      <text {...F} className="dim" x={ex + zTop + 5.4} y={0.7} fontSize={2.1} transform={`rotate(-90 ${ex + zTop + 5.4} 0.7)`} textAnchor="middle">
        {String(spec.lugToLug).replace('.', ',')}
      </text>
      <text {...F} className="dim" x={ex} y={L + 7.6} fontSize={2.1} textAnchor="middle">
        {String(spec.thickness).replace('.', ',')}
      </text>
      <text {...F} className="dim" x={0} y={L + 7.6} fontSize={2.1} textAnchor="middle">
        {spec.lugWidth}
      </text>
      <text {...F} x={ex - 7.5} y={-L - 5.4} fontSize={2.5}>
        pianta e fianco
      </text>
    </PlateSvg>
  );
}

/* ------------------------------------------------------------ proportion study, for the margins */

export function PlateProportion() {
  const R = 19.5;
  const phi = 1.618;
  const svgRef = useLive((m, sec) => m.spin('wheel', sec * 1.2 * DEG, [0, 0]), true);
  return (
    <PlateSvg svgRef={svgRef} mode="scrub" viewBox="-66 -66 132 132" label="A proportion study: the case inscribed in a square and a circle.">
      <circle className="c" r={R} strokeWidth={0.16} {...D} />
      <circle className="c" r={R * phi} strokeWidth={0.14} {...D} />
      <circle className="c" r={R * phi * phi} strokeWidth={0.14} {...D} />
      <circle className="c" r={R * phi * phi * Math.SQRT2 * 0.88} strokeWidth={0.12} {...D} />
      <rect className="c" x={-R * phi * phi} y={-R * phi * phi} width={R * phi * phi * 2} height={R * phi * phi * 2} strokeWidth={0.14} {...D} />
      <path className="c" d={`M${-R * phi * phi} ${-R * phi * phi}L${R * phi * phi} ${R * phi * phi}M${R * phi * phi} ${-R * phi * phi}L${-R * phi * phi} ${R * phi * phi}`} strokeWidth={0.12} {...D} />
      <path className="c" d={`M-66 0H66M0 -66V66`} strokeWidth={0.12} {...D} />
      <Live id="wheel">
        <path className="c" d={ptsToPath(gearOutline({ N: 48, m: 0.58 }), true)} strokeWidth={0.14} {...D} />
      </Live>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * TAU;
        return <line key={i} className="c" x1={Math.cos(a) * R * phi} y1={Math.sin(a) * R * phi} x2={Math.cos(a) * R * phi * phi} y2={Math.sin(a) * R * phi * phi} strokeWidth={0.1} {...D} />;
      })}
    </PlateSvg>
  );
}
