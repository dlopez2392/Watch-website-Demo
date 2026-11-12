import * as THREE from 'three';
import { DEG, PLATE_T, TAU, gearOutline, type P2 } from '../lib/calibre';
import type { WatchSpec } from '../lib/watches';
import { SIDE_PROFILE, circlePts, cyl, extrudeZ, lathe, merge, shapeOf, sweep, type Frame } from './geo';
import type { MatKey, MatLib } from './materials';
import { PartBuilder, type Part } from './parts';
import { bezelTexture, casebackTexture, dialTexture, strapTexture } from './textures';

/** Heights along the watch axis; z = 0 is the dial-side face of the mainplate. */
export const CASE = {
  r: 19.5,
  bottom: -5.6,
  top: 1.3,
  backBottom: -7.2,
  stemZ: -1.2,
  dialTop: 0.4,
  dialR: 16.3,
};
export const SUB_SECONDS: P2 = [0, -8.6];

export interface ExteriorRefs {
  hour: THREE.Object3D;
  minute: THREE.Object3D;
  smallSeconds?: THREE.Object3D;
  centreSeconds?: THREE.Object3D;
  gmt?: THREE.Object3D;
}

export interface Ctx {
  spec: WatchSpec;
  mats: MatLib;
  detail: number;
  textureSize: number;
  parts: Part[];
  disposables: { dispose(): void }[];
  /** sapphire surfaces, so the scene can tune how strongly they reflect */
  glass: THREE.MeshPhysicalMaterial[];
}

const part = (ctx: Ctx, id: Part['id'], explode: [number, number, number], anchor: [number, number, number]) => {
  const b = new PartBuilder(id, ctx.mats, ctx.detail, explode, anchor);
  ctx.parts.push(b.part);
  return b;
};

function leaf(L: number, W: number): P2[] {
  const n = 22;
  const right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = 0.6 + (L - 0.6) * t;
    const hw = W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.9) + 0.15 * (1 - t);
    right.push([hw, y]);
  }
  const left = right
    .slice(0, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as P2);
  return [...right, ...left];
}

function handGeometry(pts: P2[], bossR: number, z: number, thick = 0.2): THREE.BufferGeometry {
  return merge([extrudeZ(shapeOf(pts), z, z + thick, 0.075), cyl(bossR, z - 0.02, z + thick + 0.04, 28)]);
}

export function buildExterior(ctx: Ctx): ExteriorRefs {
  const { spec, mats } = ctx;
  const gold = spec.caseMetal === 'gold';
  const POL: MatKey = gold ? 'goldPolished' : 'steelPolished';
  const BRU: MatKey = gold ? 'goldBrushed' : 'steelBrushed';
  const segs = ctx.detail >= 1 ? 144 : 80;
  const diver = spec.bezel === 'dive';

  /* ---------------- crystal ---------------- */
  {
    const b = part(ctx, 'crystal', [0, 0, 47], [9.5, 6, 3.4]);
    const h = diver ? 0.4 : 0.95;
    const z0 = diver ? 3.12 : 2.92;
    const a = 16.4;
    const rho = (a * a + h * h) / (2 * h);
    const dome: P2[] = [];
    for (let i = 0; i <= 18; i++) {
      const r = a * (1 - i / 18);
      dome.push([Math.max(r, 0.0001), z0 + h - (rho - Math.sqrt(rho * rho - r * r))]);
    }
    const geo = lathe(
      [{ pts: [[16.72, 1.95], [16.72, z0 - 0.22]] }, { pts: [[16.72, z0 - 0.22], [16.4, z0]] }, { pts: dome, smooth: true }],
      segs,
    );
    const glassMat = mats.crystal(b.part.ink) as THREE.MeshPhysicalMaterial;
    ctx.glass.push(glassMat);
    b.mesh(geo, glassMat, { cast: false });
    b.part.group.children[0].renderOrder = 5;
    b.proxy(cyl(16.7, 2.0, 3.9, 24));
  }

  /* ---------------- bezel ---------------- */
  {
    const b = part(ctx, 'bezel', [0, 0, 39], [-17.6, -4, 2.4]);
    if (spec.bezel === 'smooth') {
      const geo = lathe(
        [
          { pts: [[19.3, 1.3], [19.3, 1.52]] },
          { pts: [[19.3, 1.52], [19.05, 2.1], [18.5, 2.56], [17.7, 2.84]], smooth: true },
          { pts: [[17.7, 2.84], [16.98, 2.86]] },
          { pts: [[16.98, 2.86], [16.75, 2.68]] },
          { pts: [[16.75, 2.68], [16.75, 1.3]] },
          { pts: [[16.75, 1.3], [19.3, 1.3]] },
        ],
        segs,
      );
      b.mesh(geo, POL);
    } else {
      const R = diver ? 19.85 : 19.4;
      if (diver) {
        const knurl = gearOutline({ N: 120, m: 0.33 }, { add: 0.55, ded: 0.55 });
        const ring = extrudeZ(shapeOf(knurl, [circlePts(16.75, 72).reverse()]), 1.3, 2.98, 0.1);
        b.mesh(ring, 'steelPolished', { edges: 50 });
      } else {
        const geo = lathe(
          [
            { pts: [[R, 1.3], [R, 2.45]], mat: 1 },
            { pts: [[R, 2.45], [R - 0.35, 2.86]] },
            { pts: [[R - 0.35, 2.86], [16.95, 2.86]] },
            { pts: [[16.95, 2.86], [16.75, 2.68]] },
            { pts: [[16.75, 2.68], [16.75, 1.3]] },
            { pts: [[16.75, 1.3], [R, 1.3]] },
          ],
          segs,
        );
        b.mesh(geo, [b.mat('steelPolished'), b.mat('steelBrushed')]);
      }
      const outer = diver ? 19.2 : 19.02;
      const insert = new THREE.RingGeometry(16.96, outer, segs, 1);
      insert.translate(0, 0, diver ? 2.99 : 2.87);
      const map = bezelTexture(diver ? 'dive' : 'gmt', outer, ctx.textureSize / 2);
      ctx.disposables.push(map);
      const m = diver
        ? new THREE.MeshPhysicalMaterial({ map, metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 })
        : new THREE.MeshStandardMaterial({ map, metalness: 1, roughness: 0.36 });
      b.mesh(insert, mats.custom(m, b.part.ink), { edges: false, cast: false });
    }
    b.proxy(lathe([{ pts: [[19.6, 1.3], [19.6, 3.0]] }, { pts: [[19.6, 3.0], [16.8, 3.0]] }, { pts: [[16.8, 3.0], [16.8, 1.3]] }], 28));
  }

  /* ---------------- hands ---------------- */
  const refs = {} as ExteriorRefs;
  {
    const b = part(ctx, 'hands', [0, 0, 27], [0, 0, 1.4]);
    const HM: MatKey = spec.handMetal === 'blued' ? 'blued' : spec.handMetal === 'gold' ? 'goldPolished' : 'steelPolished';
    const lumeMat = () =>
      mats.custom(
        new THREE.MeshStandardMaterial({ color: spec.dial.lume ?? '#e7eedb', roughness: 0.85, metalness: 0, emissive: '#aebfa0', emissiveIntensity: 0.12 }),
        b.part.ink,
      );
    const hour = b.group();
    const minute = b.group();
    refs.hour = hour;
    refs.minute = minute;
    if (spec.hands === 'leaf') {
      b.mesh(handGeometry(leaf(9.9, 0.98), 1.2, 0.92), HM, { parent: hour });
      b.mesh(handGeometry(leaf(14.7, 0.74), 0.95, 1.22), HM, { parent: minute });
    } else {
      const sword = spec.hands === 'sword';
      const blade = (L: number, w: number): P2[] =>
        sword
          ? [[-w * 0.55, -1.7], [w * 0.55, -1.7], [w, L - 2.6], [0, L], [-w, L - 2.6]]
          : [[-w * 0.62, -1.9], [w * 0.62, -1.9], [w * 0.62, L], [-w * 0.62, L]];
      const fill = (L: number, w: number): P2[] =>
        sword
          ? [[-w * 0.3, 1.9], [w * 0.3, 1.9], [w * 0.62, L - 2.75], [0, L - 0.95], [-w * 0.62, L - 2.75]]
          : [[-w * 0.3, 2.0], [w * 0.3, 2.0], [w * 0.3, L - 0.5], [-w * 0.3, L - 0.5]];
      b.mesh(handGeometry(blade(9.6, 1.02), 1.25, 0.92), HM, { parent: hour });
      b.mesh(extrudeZ(shapeOf(fill(9.6, 1.02)), 1.1, 1.14), lumeMat(), { parent: hour, edges: false, cast: false });
      b.mesh(handGeometry(blade(14.3, 0.78), 1.0, 1.22), HM, { parent: minute });
      b.mesh(extrudeZ(shapeOf(fill(14.3, 0.78)), 1.4, 1.44), lumeMat(), { parent: minute, edges: false, cast: false });
    }
    if (spec.gmtHand) {
      const g = b.group();
      refs.gmt = g;
      const arrow: P2[] = [[-0.16, -1.4], [0.16, -1.4], [0.16, 11.1], [0.95, 11.1], [0, 13.4], [-0.95, 11.1], [-0.16, 11.1]];
      const paint = mats.custom(new THREE.MeshStandardMaterial({ color: spec.dial.accent, roughness: 0.5, metalness: 0.1 }), b.part.ink);
      b.mesh(handGeometry(arrow, 0.85, 0.66, 0.16), paint, { parent: g });
    }
    if (spec.seconds === 'centre') {
      const g = b.group();
      refs.centreSeconds = g;
      const needle: P2[] = [[-0.11, -4.2], [0.11, -4.2], [0.07, 15.4], [-0.07, 15.4]];
      const geos = [extrudeZ(shapeOf(needle), 1.52, 1.62), cyl(0.62, 1.5, 1.68, 24)];
      if (diver) geos.push(extrudeZ(shapeOf(circlePts(0.82, 24, [0, 10.4])), 1.52, 1.62));
      b.mesh(merge(geos), 'steelPolished', { parent: g });
      if (diver) b.mesh(extrudeZ(shapeOf(circlePts(0.52, 20, [0, 10.4])), 1.62, 1.65), lumeMat(), { parent: g, edges: false, cast: false });
    }
    b.mesh(cyl(0.58, 0.4, 1.78, 24), 'steelPolished');
    b.proxy(cyl(9, 0.6, 1.9, 12), hour).scale.set(0.16, 1.1, 1);
    b.proxy(cyl(13, 0.6, 1.9, 12), minute).scale.set(0.12, 1.12, 1);
    b.part.inner = (e) => {
      minute.position.z = e * 1.6;
      hour.position.z = e * 0.2;
    };
  }
  {
    const b = part(ctx, 'secondsHand', [0, 0, 23.5], [SUB_SECONDS[0], SUB_SECONDS[1], 0.9]);
    if (spec.seconds === 'small') {
      const g = b.group();
      g.position.set(SUB_SECONDS[0], SUB_SECONDS[1], 0);
      refs.smallSeconds = g;
      const needle: P2[] = [[-0.1, -1.25], [0.1, -1.25], [0.055, 3.7], [-0.055, 3.7]];
      const geo = merge([
        extrudeZ(shapeOf(needle), 0.68, 0.78, 0.03),
        extrudeZ(shapeOf(circlePts(0.36, 20, [0, -1.25])), 0.68, 0.78, 0.03),
        cyl(0.4, 0.66, 0.84, 20),
        cyl(0.17, 0.4, 0.9, 12),
      ]);
      const HM: MatKey = spec.handMetal === 'blued' ? 'blued' : 'steelPolished';
      b.mesh(geo, HM, { parent: g });
      b.proxy(cyl(4.2, 0.5, 1.0, 16), g);
    }
  }

  /* ---------------- dial ---------------- */
  {
    const b = part(ctx, 'dial', [0, 0, 19.5], [-9.2, 9.6, CASE.dialTop]);
    const map = dialTexture(spec.dial, ctx.textureSize);
    ctx.disposables.push(map);
    const face = new THREE.CircleGeometry(CASE.dialR, segs);
    face.translate(0, 0, CASE.dialTop + 0.002);
    const lacquer = spec.dial.style === 'diver' || spec.dial.style === 'classic';
    const faceMat = lacquer
      ? new THREE.MeshPhysicalMaterial({ map, metalness: 0, roughness: 0.42, clearcoat: 0.9, clearcoatRoughness: 0.12 })
      : new THREE.MeshStandardMaterial({ map, metalness: spec.dial.style === 'sector' ? 0.08 : 0.04, roughness: 0.62 });
    b.mesh(face, mats.custom(faceMat, b.part.ink), { edges: false, cast: true, receive: true });
    const body = lathe(
      [
        { pts: [[0.0001, 0], [CASE.dialR, 0]] },
        { pts: [[CASE.dialR, 0], [CASE.dialR, CASE.dialTop]] },
      ],
      segs,
    );
    b.mesh(body, 'brass');
    if (spec.applied !== 'none') {
      const geos: THREE.BufferGeometry[] = [];
      for (let h = 0; h < 12; h++) {
        if (spec.applied === 'gold' && h === 0) continue;
        const a = Math.PI / 2 - (h / 12) * TAU;
        const quarter = h % 3 === 0;
        const mk = (off: number) => {
          const g = new THREE.BoxGeometry(quarter ? 3.1 : 2.5, 0.52, 0.3);
          g.translate(12.55, off, CASE.dialTop + 0.15);
          g.rotateZ(a);
          geos.push(g);
        };
        if (spec.applied === 'steel' && h === 0) {
          mk(0.42);
          mk(-0.42);
        } else mk(0);
      }
      b.mesh(merge(geos), spec.applied === 'gold' ? 'goldPolished' : 'steelPolished', { cast: true });
    }
    b.proxy(cyl(CASE.dialR, 0, 0.5, 28));
  }

  /* ---------------- crown and stem ---------------- */
  {
    const b = part(ctx, 'crown', [12, 0, -36], [21.6, 0, CASE.stemZ + 2.4]);
    const x0 = diver ? 20.6 : 20.3;
    const flute = extrudeZ(shapeOf(gearOutline({ N: 30, m: 0.18 }, { add: 0.5, ded: 0.7 })), 0, 2.5, 0.14);
    flute.rotateY(Math.PI / 2);
    flute.translate(x0, 0, CASE.stemZ);
    b.mesh(flute, POL, { edges: 50 });
    const along = (r: number, xa: number, xb: number, s = 28) => {
      const g = new THREE.CylinderGeometry(r, r, xb - xa, s);
      g.rotateZ(-Math.PI / 2);
      g.translate((xa + xb) / 2, 0, CASE.stemZ);
      return g;
    };
    b.mesh(merge([along(2.3, x0 + 2.5, x0 + 2.82), along(1.7, 19.45, x0)]), POL);
    const pin = extrudeZ(shapeOf(gearOutline({ N: 14, m: 0.16 })), 0, 1.1, 0.04);
    pin.rotateY(Math.PI / 2);
    pin.translate(12.3, 0, CASE.stemZ);
    b.mesh(merge([along(0.42, 5.4, 19.6, 14), along(0.92, 9.4, 11.1, 20), pin]), 'steelFrosted');
    b.proxy(along(3.1, 19.4, x0 + 3, 12));
    b.proxy(along(1.1, 5.4, 19.4, 8));
  }

  /* ---------------- case middle ---------------- */
  {
    const b = part(ctx, 'caseMiddle', [0, 0, -36], [-13.6, 14, 0.4]);
    const R = CASE.r;
    const body = lathe(
      [
        { pts: [[16.5, CASE.bottom], [18.6, CASE.bottom]], mat: 2 },
        { pts: [[18.6, CASE.bottom], [R, CASE.bottom + 0.9]] },
        { pts: [[R, CASE.bottom + 0.9], [R, 0.6]], mat: 1 },
        { pts: [[R, 0.6], [18.9, CASE.top]] },
        { pts: [[18.9, CASE.top], [16.6, CASE.top]], mat: 2 },
        { pts: [[16.6, CASE.top], [16.0, 0.46]], mat: 1 },
        { pts: [[16.0, 0.46], [16.5, 0.46]], mat: 2 },
        { pts: [[16.5, 0.46], [16.5, CASE.bottom]], mat: 2 },
      ],
      segs,
    );
    b.mesh(body, [b.mat(POL), b.mat(BRU), b.mat(gold ? 'goldSatin' : 'steelSatin')]);

    const lug = new THREE.Shape();
    lug.moveTo(14.4, CASE.bottom);
    lug.lineTo(14.4, 1.14);
    lug.splineThru([
      new THREE.Vector2(18.4, 1.08),
      new THREE.Vector2(20.6, 0.3),
      new THREE.Vector2(22.3, -1.5),
      new THREE.Vector2(23.4, -3.6),
      new THREE.Vector2(23.62, -4.9),
    ]);
    lug.lineTo(23.1, CASE.bottom + 0.1);
    lug.lineTo(14.4, CASE.bottom);
    const lugGeo = () => {
      const g = new THREE.ExtrudeGeometry(lug, { depth: 2.3, bevelEnabled: true, bevelSize: 0.22, bevelThickness: 0.22, bevelOffset: -0.22, bevelSegments: 2, curveSegments: 18 });
      g.applyMatrix4(SIDE_PROFILE);
      return g;
    };
    const a = lugGeo().translate(10.22, 0, 0);
    const c = lugGeo().translate(-12.52, 0, 0);
    const lugs = [a, c, a.clone().rotateZ(Math.PI), c.clone().rotateZ(Math.PI)];
    const bars = [1, -1].map((s) => {
      const g = new THREE.CylinderGeometry(0.55, 0.55, 20.4, 12);
      g.rotateZ(Math.PI / 2);
      g.translate(0, s * 21.2, -2.9);
      return g;
    });
    const tube = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 20);
    tube.rotateZ(-Math.PI / 2);
    tube.translate(19.55, 0, CASE.stemZ);
    const extras: THREE.BufferGeometry[] = [...lugs, ...bars, tube];
    if (spec.crownGuards) {
      const guard: P2[] = [[18.4, 1.9], [22.0, 2.2], [22.5, 3.0], [21.9, 4.5], [18.0, 6.0]];
      const g1 = extrudeZ(shapeOf(guard), -3.9, 0.7, 0.3);
      const g2 = extrudeZ(shapeOf(guard.map(([x, y]) => [x, -y] as P2).reverse()), -3.9, 0.7, 0.3);
      extras.push(g1, g2);
    }
    b.mesh(merge(extras), BRU);
    b.proxy(
      lathe([{ pts: [[R + 0.2, CASE.bottom], [R + 0.2, CASE.top]] }, { pts: [[R + 0.2, CASE.top], [16.4, CASE.top]] }, { pts: [[16.4, CASE.top], [16.4, CASE.bottom]] }], 28),
    );
    for (const s of [1, -1]) {
      const p = new THREE.BoxGeometry(27, 6, 6.6);
      p.translate(0, s * 20.6, -2.3);
      b.proxy(p);
    }
  }

  /* ---------------- caseback ---------------- */
  {
    const b = part(ctx, 'caseback', [0, 0, -46], [12.8, 11, CASE.backBottom + 0.9]);
    const zb = CASE.backBottom;
    const text = casebackTexture(`VALDARNO  ·  FIRENZE  ·  ${spec.name.toUpperCase()}  ·  REF. ${spec.ref}  ·  N° 001  ·  `);
    ctx.disposables.push(text);
    const engraved = mats.custom(new THREE.MeshStandardMaterial({ map: text, metalness: 1, roughness: 0.3 }), b.part.ink);
    const inner = spec.displayBack ? 14.6 : 0.0001;
    const runs = [
      { pts: [[17.4, zb], [18.5, zb + 0.6]] as P2[] },
      { pts: [[18.5, zb + 0.6], [18.5, CASE.bottom]] as P2[], mat: 1 },
      { pts: [[18.5, CASE.bottom], [inner, CASE.bottom]] as P2[] },
      { pts: [[inner, CASE.bottom], [inner, zb]] as P2[] },
      { pts: [[14.6, zb], [17.4, zb]] as P2[], mat: 2 },
    ];
    if (!spec.displayBack) runs.push({ pts: [[0.0001, zb], [14.6, zb]] as P2[], mat: 1 });
    b.mesh(lathe(runs, segs), [b.mat(POL), b.mat(BRU), engraved]);
    if (spec.displayBack) {
      const glass = new THREE.CircleGeometry(14.6, segs);
      glass.rotateX(Math.PI);
      glass.translate(0, 0, zb + 0.55);
      const m = mats.crystal(b.part.ink) as THREE.MeshPhysicalMaterial;
      m.side = THREE.DoubleSide;
      ctx.glass.push(m);
      const mesh = b.mesh(glass, m, { cast: false, edges: false });
      mesh.renderOrder = 5;
    }
    b.proxy(cyl(18.5, zb, CASE.bottom, 24));
  }

  /* ---------------- strap and buckle ---------------- */
  {
    const ctrl: P2[] = [
      [19.9, -2.75],
      [21.4, -2.95],
      [24.9, -6.4],
      [27.6, -12.6],
      [26.6, -20.4],
      [21.0, -27.2],
      [10.8, -31.6],
      [0, -33],
    ];
    const all = [...ctrl, ...ctrl.slice(0, -1).reverse().map(([y, z]) => [-y, z] as P2)];
    const curve = new THREE.CatmullRomCurve3(all.map(([y, z]) => new THREE.Vector3(0, y, z)), false, 'centripetal');
    const mid = new THREE.Vector3(0, 0, -17);
    const X = new THREE.Vector3(1, 0, 0);
    const smooth = (a: number, bb: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (bb - a)));
      return t * t * (3 - 2 * t);
    };
    const frameAt = (u: number, lift = 0): Frame => {
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const n = new THREE.Vector3().crossVectors(t, X).normalize();
      if (n.dot(p.clone().sub(mid)) < 0) n.negate();
      const edge = Math.min(u, 1 - u);
      const width = 18 + 2 * (1 - smooth(0.02, 0.2, edge));
      const thick = 2.05 + 0.9 * (1 - smooth(0.0, 0.16, edge));
      return { p: p.addScaledVector(n, lift), n, b: X.clone(), width, thick };
    };
    const BUCKLE_U = 0.385;
    const framesShort: Frame[] = [];
    for (let i = 0; i <= 40; i++) framesShort.push(frameAt((i / 40) * BUCKLE_U));
    const framesLong: Frame[] = [];
    const tail = 0.205;
    for (let i = 0; i <= 80; i++) {
      const u = 1 - (i / 80) * (1 - tail);
      const f = frameAt(u, 2.4 * smooth(0.47, BUCKLE_U, u));
      const toTip = (u - tail) / 0.03;
      if (toTip < 1) f.width *= 0.35 + 0.65 * Math.sqrt(Math.max(0, toTip));
      framesLong.push(f);
    }
    const map = strapTexture(spec.strap.color, spec.strap.stitch);
    ctx.disposables.push(map);

    const b = part(ctx, 'strap', [0, 0, -36], [0, -27.4, -15]);
    const leather = mats.leather(map, b.part.ink);
    const gShort = b.group();
    const gLong = b.group();
    b.mesh(sweep(framesShort), leather, { parent: gShort, edges: 55 });
    b.mesh(sweep(framesLong), leather, { parent: gLong, edges: 55 });
    for (const u of [0.325, 0.265]) {
      const k = [u - 0.014, u, u + 0.014].map((uu) => {
        const f = frameAt(uu, 1.2);
        f.width = 20.2;
        f.thick = 5.6;
        return f;
      });
      b.mesh(sweep(k), leather, { parent: gShort, edges: false });
    }
    // adjustment holes on the tail
    const holeGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const f = frameAt(0.23 + i * 0.036, 2.4 * smooth(0.47, BUCKLE_U, 0.23 + i * 0.036));
      const g = new THREE.CircleGeometry(0.75, 14);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.n);
      g.applyQuaternion(q);
      g.translate(f.p.x + f.n.x * (f.thick * 0.6 + 0.02), f.p.y + f.n.y * (f.thick * 0.6 + 0.02), f.p.z + f.n.z * (f.thick * 0.6 + 0.02));
      holeGeos.push(g);
    }
    b.mesh(merge(holeGeos), 'dark', { parent: gLong, edges: false, cast: false });
    for (const [frames, g] of [
      [framesShort, gShort],
      [framesLong, gLong],
    ] as [Frame[], THREE.Group][]) {
      for (let i = 4; i < frames.length; i += 9) {
        const f = frames[i];
        const box = new THREE.BoxGeometry(f.width, 3.4, 9);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.n);
        box.applyQuaternion(q);
        box.translate(f.p.x, f.p.y, f.p.z);
        b.proxy(box, g);
      }
    }
    b.part.inner = (e) => {
      gShort.position.y = e * 9;
      gLong.position.y = -e * 9;
    };

    const bk = part(ctx, 'buckle', [0, 9, -36], [0, 0, 0]);
    const f = frameAt(BUCKLE_U + 0.012);
    const t = curve.getTangentAt(BUCKLE_U + 0.012);
    const basis = new THREE.Matrix4().makeBasis(X, t, f.n).setPosition(f.p.clone().addScaledVector(f.n, 1.2));
    const w = 12.2;
    const l = 7.6;
    const rr = 2.2;
    const loop: THREE.Vector3[] = [];
    const corners: [number, number, number][] = [
      [w - rr, l - rr, 0],
      [-(w - rr), l - rr, 90],
      [-(w - rr), -(l - rr), 180],
      [w - rr, -(l - rr), 270],
    ];
    for (const [cx, cy, a0] of corners) {
      for (let i = 0; i <= 5; i++) {
        const a = (a0 + i * 18) * DEG;
        loop.push(new THREE.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0));
      }
    }
    const frameGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true, 'catmullrom', 0.12), 96, 0.9, 10, true);
    const pinGeo = new THREE.CylinderGeometry(0.5, 0.42, l * 2 + 0.4, 10);
    pinGeo.translate(0, 0.1, 0.75);
    const barGeo = new THREE.CylinderGeometry(0.62, 0.62, w * 2 - 1.4, 10);
    barGeo.rotateZ(Math.PI / 2);
    barGeo.translate(0, -(l - 0.2), 0);
    const buckleGeo = merge([frameGeo, pinGeo, barGeo]);
    buckleGeo.applyMatrix4(basis);
    bk.mesh(buckleGeo, POL, { edges: 60 });
    bk.part.anchor.copy(f.p).addScaledVector(f.n, 2.5);
    const px = new THREE.BoxGeometry(w * 2 + 2, l * 2 + 2, 3.5);
    px.applyMatrix4(basis);
    bk.proxy(px);
    bk.part.explode.copy(f.n).multiplyScalar(11).add(new THREE.Vector3(0, 9, -36));
  }

  return refs;
}

export const MOVEMENT_Z = -PLATE_T;
