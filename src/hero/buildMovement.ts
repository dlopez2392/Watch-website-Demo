import * as THREE from 'three';
import {
  AX,
  BALANCE_R,
  BANKING,
  HAIRSPRING,
  MAINSPRING,
  COCK_FOOT,
  DEG,
  GEAR,
  JEWELS,
  LV,
  PALLET_BRIDGE_END,
  PLATE_R,
  PLATE_T,
  SCREWS,
  TAU,
  add,
  angleTo,
  barrelBridgeSegs,
  cockSegs,
  escapeOutline,
  gearOutline,
  pitchR,
  polar,
  segsToPoints,
  spiral,
  trainBridgeSegs,
  zOf,
  type Gear,
  type P2,
} from '../lib/calibre';
import { circlePts, cyl, discInPoly, extrudeZ, facetGroups, lathe, merge, polarUV, ribbon, shapeOf, spokeWindows } from './geo';
import type { Ctx } from './buildExterior';
import { PartBuilder, type Part } from './parts';
import { aoTexture, engravingTexture } from './textures';

/** the engraving is drawn on the same square as the dials: 32.6 mm across */
const DIAL_SPAN = 32.6;

export interface MovementRefs {
  barrel: THREE.Object3D;
  centre: THREE.Object3D;
  third: THREE.Object3D;
  fourth: THREE.Object3D;
  escape: THREE.Object3D;
  pallet: THREE.Object3D;
  palletRest: number;
  balance: THREE.Object3D;
  hairspring: THREE.Object3D;
}

const part = (ctx: Ctx, id: Part['id'], explode: [number, number, number], anchor: [number, number, number]) => {
  const b = new PartBuilder(id, ctx.mats, ctx.detail, explode, anchor);
  ctx.parts.push(b.part);
  return b;
};

const at = (g: THREE.Object3D, p: P2) => {
  g.position.set(p[0], p[1], 0);
  return g;
};

/** A spoked wheel lying at height m (measured from the plate towards the bridges). */
function wheelGeo(g: Gear, m: number, opts: { spokes: number; rim: number; hub: number; spokeW: number; thick?: number }) {
  const t = opts.thick ?? 0.16;
  const rimIn = pitchR(g) - g.m * 1.25 - opts.rim;
  const shape = shapeOf(gearOutline(g), spokeWindows(rimIn, opts.hub, opts.spokes, opts.spokeW, 0.3));
  return turned(extrudeZ(shape, zOf(m + t / 2), zOf(m - t / 2), 0.045));
}

/** A flat part off the lathe: circular grain on both faces (group 0), polished edges and bevels (group 1). */
const turned = (g: THREE.BufferGeometry) => facetGroups(polarUV(g), { plus: 0, minus: 0, wall: 1, bevel: 1 });

/** Holes through a bridge for the jewels and screws that sit in it; the bevel of the extrusion turns each into a polished sink. */
function sinks(outline: P2[], level: number, on: string[]): P2[][] {
  const holes: P2[][] = [];
  for (const j of JEWELS) {
    const r = j.r + (j.chaton ? 0.38 : 0.04);
    if (j.level === level && discInPoly(j.at, r + 0.35, outline)) holes.push(circlePts(r, 28, j.at).reverse());
  }
  for (const sc of SCREWS) {
    if (on.includes(sc.on) && discInPoly(sc.at, 1.2, outline)) holes.push(circlePts(0.8, 24, sc.at).reverse());
  }
  return holes;
}

const pinionGeo = (g: Gear, span: P2) => extrudeZ(shapeOf(gearOutline(g, { add: 0.9, ded: 1.1 })), zOf(span[1]), zOf(span[0]), 0.03);

/** Seen from the back: stripes on the face turned to the viewer, satin underneath and on the flanks, polished anglage. */
const BRIDGE_FACES = { plus: 1, minus: 0, wall: 1, bevel: 2 };

export function buildMovement(ctx: Ctx): MovementRefs {
  const refs = {} as MovementRefs;
  const segs = ctx.detail >= 1 ? 128 : 72;
  const fine = ctx.detail >= 1;

  /* ---------------- mainplate ---------------- */
  {
    const b = part(ctx, 'mainplate', [0, 0, 9.5], [-11.5, -8.4, 0]);
    const plate = lathe(
      [
        { pts: [[PLATE_R, 0], [0.0001, 0]] },
        { pts: [[PLATE_R, -PLATE_T], [PLATE_R, 0]], mat: 1 },
        { pts: [[0.0001, -PLATE_T], [PLATE_R, -PLATE_T]] },
      ],
      segs,
      { planarUV: 4.6 },
    );
    // Contact shading on the plate, read through a second set of planar UVs: deep under the bridges and the cock,
    // softer under the wheels and the barrel, and gathering at the rim where the plate meets the case.
    const uv1 = new Float32Array(plate.attributes.position.count * 2);
    for (let i = 0; i < plate.attributes.position.count; i++) {
      uv1[i * 2] = plate.attributes.position.getX(i) / (PLATE_R * 2) + 0.5;
      uv1[i * 2 + 1] = plate.attributes.position.getY(i) / (PLATE_R * 2) + 0.5;
    }
    plate.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    const ao = aoTexture(Math.min(1024, ctx.textureSize / 2), PLATE_R * 2, (p) => {
      p.ring([0, 0], PLATE_R - 1.4, PLATE_R, 0.45);
      p.disc(AX.barrel, pitchR(GEAR.barrel) + 0.2, 1.0, 0.4);
      for (const [c, g] of [[AX.centre, GEAR.centreWheel], [AX.third, GEAR.thirdWheel], [AX.fourth, GEAR.fourthWheel]] as const) p.disc(c, pitchR(g), 0.8, 0.22);
      p.disc(AX.escape, 2.4, 0.6, 0.25);
      p.disc(AX.balance, BALANCE_R, 0.9, 0.3);
      for (const pts of [segsToPoints(barrelBridgeSegs()), segsToPoints(trainBridgeSegs()), segsToPoints(cockSegs())]) p.poly(pts, 1.1, 0.5);
      p.disc(PALLET_BRIDGE_END, 0.9, 0.6, 0.4);
    });
    ao.channel = 1;
    ctx.disposables.push(ao);
    const plateMat = b.mat('plate') as THREE.MeshStandardMaterial;
    plateMat.aoMap = ao;
    ctx.ao.push({ mats: [plateMat], ids: ['mainplate', 'bridges', 'balanceCock', 'barrel'] });
    b.mesh(plate, [plateMat, b.mat('bridgeSide')], { receive: true });
    // motion works and keyless cover, on the dial side
    const hourW = extrudeZ(shapeOf(gearOutline(GEAR.hourWheel)), 0.04, 0.26, 0.03);
    const minW = extrudeZ(shapeOf(gearOutline(GEAR.minuteWheel)), 0.04, 0.22, 0.03).translate(AX.minuteWheel[0], AX.minuteWheel[1], 0);
    b.mesh(merge([hourW, minW, cyl(0.9, 0.04, 0.34, 20)]), 'brass');
    const cover: P2[] = [[8.0, -2.7], [14.1, -3.5], [14.5, 1.3], [12.0, 3.5], [8.5, 2.5], [7.2, 0.1]];
    b.mesh(extrudeZ(shapeOf(cover), 0.02, 0.3, 0.06), 'steelBrushed');
    const tops = [AX.third, AX.fourth, AX.escape, AX.pallet, AX.balance].map((p) => cyl(0.46, 0.0, 0.07, 16, p));
    b.mesh(merge(tops), 'ruby', { edges: false });
    // banking pins, standing up from the plate either side of the lever
    b.mesh(merge(BANKING.map((p) => cyl(0.11, zOf(LV.pallet + 0.12), -PLATE_T, 10, p))), 'steelPolished', { edges: false });
    b.mesh(lathe([{ pts: [[0.5, 0.08], [0.95, 0.08]] }, { pts: [[0.95, 0.08], [0.95, 0]] }], 24).translate(AX.balance[0], AX.balance[1], 0), 'chaton', { edges: false });
    b.proxy(cyl(PLATE_R, -PLATE_T, 0.3, 28));
  }

  /* ---------------- barrel ---------------- */
  {
    const b = part(ctx, 'barrel', [0, 0, 0], [AX.barrel[0] + 4.6, AX.barrel[1] + 4.2, zOf(0.3)]);
    const g = at(b.group(), AX.barrel);
    refs.barrel = g;
    const floor = extrudeZ(shapeOf(gearOutline(GEAR.barrel)), zOf(LV.barrelTeeth[1]), zOf(LV.barrelTeeth[0]), 0.03);
    b.mesh(turned(floor), [b.mat('brass'), b.mat('brassPolished')], { parent: g });
    const wall = lathe(
      [
        { pts: [[6.42, zOf(1.2)], [6.42, zOf(0.25)]], mat: 0 },
        { pts: [[6.42, zOf(0.25)], [6.05, zOf(0.25)]] },
        { pts: [[6.05, zOf(0.25)], [6.05, zOf(1.2)]] },
      ],
      segs,
    );
    b.mesh(wall, 'brass', { parent: g });
    const arbor = merge([cyl(1.15, zOf(1.55), zOf(0.22), 24), cyl(0.62, zOf(LV.keyless[1]), zOf(1.55), 16)]);
    b.mesh(arbor, 'steelPolished', { parent: g });
    const spring = ribbon(spiral(MAINSPRING.r0, MAINSPRING.r1, MAINSPRING.turns, fine ? 1100 : 560), zOf(1.16), zOf(0.36), MAINSPRING.thick);
    b.mesh(spring, 'spring', { parent: g, edges: fine ? 60 : false });
    const lidG = b.group(g);
    const lid = lathe(
      [
        { pts: [[6.0, zOf(0.16)], [1.2, zOf(0.16)]] },
        { pts: [[1.2, zOf(0.3)], [6.0, zOf(0.3)]] },
        { pts: [[6.0, zOf(0.3)], [6.0, zOf(0.16)]] },
      ],
      segs,
    );
    b.mesh(lid, 'brass', { parent: lidG });
    b.proxy(cyl(6.9, zOf(1.55), zOf(0.15), 20), g);
    b.part.inner = (e) => {
      lidG.position.z = e * 6.5;
    };
  }

  /* ---------------- going train ---------------- */
  {
    const b = part(ctx, 'centreWheel', [0, 0, -3], [3.6, 3.4, zOf(LV.centreWheel)]);
    const g = at(b.group(), AX.centre);
    refs.centre = g;
    b.mesh(wheelGeo(GEAR.centreWheel, LV.centreWheel, { spokes: 5, rim: 0.5, hub: 1.0, spokeW: 0.52 }), [b.mat('brass'), b.mat('brassPolished')], { parent: g });
    b.mesh(merge([pinionGeo(GEAR.centrePinion, LV.centrePinion), cyl(0.42, zOf(LV.bridge[0]), 0.38, 16)]), 'steelPolished', { parent: g });
    b.proxy(cyl(5.3, zOf(1.95), zOf(1.1), 20), g);
  }
  {
    const b = part(ctx, 'thirdWheel', [0, 0, -5.5], [AX.third[0] + 2.7, AX.third[1] - 2.6, zOf(LV.thirdWheel)]);
    const g = at(b.group(), AX.third);
    refs.third = g;
    b.mesh(wheelGeo(GEAR.thirdWheel, LV.thirdWheel, { spokes: 5, rim: 0.42, hub: 0.72, spokeW: 0.4 }), [b.mat('brass'), b.mat('brassPolished')], { parent: g });
    b.mesh(merge([pinionGeo(GEAR.thirdPinion, LV.thirdPinion), cyl(0.22, zOf(LV.bridge[0]), zOf(0.02), 12)]), 'steelPolished', { parent: g });
    b.proxy(cyl(4.05, zOf(2.4), zOf(1.5), 20), g);
  }
  {
    const b = part(ctx, 'fourthWheel', [0, 0, -8], [AX.fourth[0] + 2.2, AX.fourth[1] - 3.2, zOf(LV.fourthWheel)]);
    const g = at(b.group(), AX.fourth);
    refs.fourth = g;
    b.mesh(wheelGeo(GEAR.fourthWheel, LV.fourthWheel, { spokes: 6, rim: 0.4, hub: 0.7, spokeW: 0.36 }), [b.mat('brass'), b.mat('brassPolished')], { parent: g });
    b.mesh(merge([pinionGeo(GEAR.fourthPinion, LV.fourthPinion), cyl(0.2, zOf(LV.bridge[0]), 0.62, 12)]), 'steelPolished', { parent: g });
    b.proxy(cyl(4.1, zOf(2.45), zOf(1.2), 20), g);
  }
  {
    const b = part(ctx, 'escapeWheel', [0, 0, -10.5], [AX.escape[0] - 1.6, AX.escape[1] - 1.8, zOf(LV.escapeWheel)]);
    const g = at(b.group(), AX.escape);
    refs.escape = g;
    const wheel = extrudeZ(shapeOf(escapeOutline(), spokeWindows(1.42, 0.5, 3, 0.26, 0.2)), zOf(LV.escapeWheel + 0.06), zOf(LV.escapeWheel - 0.06), 0.02);
    b.mesh(merge([wheel, pinionGeo(GEAR.escapePinion, LV.escapePinion), cyl(0.15, zOf(LV.bridge[0]), zOf(0.02), 10)]), 'steelPolished', { parent: g });
    b.proxy(cyl(2.5, zOf(2.2), zOf(1.0), 16), g);
  }

  /* ---------------- pallet fork ---------------- */
  {
    const b = part(ctx, 'palletFork', [0, 0, -12.5], [AX.pallet[0], AX.pallet[1], zOf(LV.pallet)]);
    const g = at(b.group(), AX.pallet);
    refs.palletRest = angleTo(AX.pallet, AX.balance);
    g.rotation.z = refs.palletRest;
    refs.pallet = g;
    const outline: P2[] = [
      [2.78, -0.17], [2.3, -0.17], [2.3, 0.17], [2.78, 0.17], [2.78, 0.5], [2.2, 0.46], [1.85, 0.2], [0.55, 0.22], [0.3, 0.4],
      [-0.55, 1.05], [-0.86, 1.45], [-1.22, 1.16], [-0.75, 0.5], [-0.62, 0],
      [-0.75, -0.5], [-1.22, -1.16], [-0.86, -1.45], [-0.55, -1.05], [0.3, -0.4], [0.55, -0.22], [1.85, -0.2], [2.2, -0.46], [2.78, -0.5],
    ];
    const z = zOf(LV.pallet);
    b.mesh(merge([extrudeZ(shapeOf(outline), z - 0.07, z + 0.07, 0.025), cyl(0.15, zOf(LV.palletBridge[0]), zOf(0.02), 10)]), 'steelPolished', { parent: g });
    const stones = [1, -1].map((s) => {
      const st = new THREE.BoxGeometry(0.82, 0.3, 0.3);
      st.rotateZ(Math.atan2(-s * 1.3, -2.06));
      st.translate(-1.2, s * 1.38, z);
      return st;
    });
    b.mesh(merge(stones), 'ruby', { parent: g, edges: false });
    b.proxy(cyl(2.6, z - 0.4, z + 0.4, 12), g);
  }

  /* ---------------- balance and hairspring ---------------- */
  {
    const b = part(ctx, 'balance', [0, 0, -16], [AX.balance[0] - 4.2, AX.balance[1] - 2.9, zOf(3.0)]);
    const g = at(b.group(), AX.balance);
    refs.balance = g;
    const rim = extrudeZ(
      shapeOf(circlePts(BALANCE_R, 72), spokeWindows(4.36, 0.92, 2, 0.72, 0.4)),
      zOf(LV.balanceRim[1]),
      zOf(LV.balanceRim[0]),
      0.07,
    );
    const zm = zOf((LV.balanceRim[0] + LV.balanceRim[1]) / 2);
    const screws: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.12;
      const s = new THREE.CylinderGeometry(0.2, 0.2, 0.52, 10);
      s.rotateZ(-Math.PI / 2);
      s.translate(BALANCE_R + 0.2, 0, zm);
      s.rotateZ(a);
      screws.push(s);
    }
    b.mesh(merge([rim, ...screws]), 'gilt', { parent: g });
    const pinA = angleTo(AX.balance, AX.pallet);
    const pin = cyl(0.13, zOf(LV.roller[1] + 0.1), zOf(LV.roller[0] - 0.02), 10, polar(0.72, pinA));
    b.mesh(merge([cyl(0.17, zOf(LV.cock[0]), zOf(0.03), 12), cyl(0.84, zOf(LV.roller[1]), zOf(LV.roller[0]), 24), cyl(0.5, zOf(3.5), zOf(3.2), 16)]), 'steelPolished', { parent: g });
    b.mesh(pin, 'ruby', { parent: g, edges: false });
    b.proxy(cyl(BALANCE_R + 0.4, zOf(3.3), zOf(1.9), 20), g);
  }
  {
    const b = part(ctx, 'hairspring', [0, 0, -19.5], [AX.balance[0] + 1.8, AX.balance[1] + 2.4, zOf(3.36)]);
    const g = at(b.group(), AX.balance);
    refs.hairspring = g;
    const coil = spiral(HAIRSPRING.r0, HAIRSPRING.r1, HAIRSPRING.turns, fine ? 640 : 330, 0.4);
    b.mesh(ribbon(coil, zOf(LV.hairspring[1]), zOf(LV.hairspring[0]), 0.048), 'blued', { parent: g, edges: fine ? 60 : false });
    const end = coil[coil.length - 1];
    b.mesh(cyl(0.3, zOf(3.62), zOf(3.24), 10, end), 'steelPolished', { parent: g, edges: false });
    b.proxy(cyl(3.5, zOf(3.5), zOf(3.2), 16), g);
  }

  /* ---------------- balance cock ---------------- */
  {
    const b = part(ctx, 'balanceCock', [0, 0, -23], [COCK_FOOT[0], COCK_FOOT[1], zOf(LV.cock[1])]);
    const cockPts = segsToPoints(cockSegs());
    const arm = extrudeZ(shapeOf(cockPts, sinks(cockPts, LV.cock[1], ['cock'])), zOf(LV.cock[1]), zOf(LV.cock[0]), 0.15);
    const dir = angleTo(COCK_FOOT, AX.balance);
    const n = dir + Math.PI / 2;
    const back = add(COCK_FOOT, polar(-1.2, dir));
    const front = add(COCK_FOOT, polar(1.3, dir));
    const foot: P2[] = [add(back, polar(2.0, n)), add(back, polar(-2.0, n)), add(front, polar(-1.9, n)), add(front, polar(1.9, n))];
    const footGeo = extrudeZ(shapeOf(foot), zOf(LV.cock[0]), zOf(0), 0.06);
    const finish = () => [b.mat('bridge'), b.mat('bridgeSide'), b.mat('bridgeBevel')];
    b.mesh(facetGroups(arm, BRIDGE_FACES, [0, 0, 1], 0.5), finish(), { receive: true });
    b.mesh(footGeo, 'bridgeSide');
    // regulator: a ring about the balance jewel with a pointer back along the arm
    const zr = zOf(LV.cock[1]);
    const ptr: P2[] = [add(AX.balance, polar(0.5, n)), add(AX.balance, polar(-0.5, n)), add(AX.balance, polar(-3.6, dir))];
    const reg = merge([
      extrudeZ(shapeOf(circlePts(1.12, 28, AX.balance), [circlePts(0.72, 20, AX.balance).reverse()]), zr - 0.14, zr, 0.03),
      extrudeZ(shapeOf(ptr), zr - 0.14, zr, 0.03),
    ]);
    b.mesh(reg, 'steelPolished');
    b.proxy(extrudeZ(shapeOf(segsToPoints(cockSegs(), 20 * DEG)), zOf(LV.cock[1]), zOf(0)));
  }

  /* ---------------- bridges ---------------- */
  {
    const b = part(ctx, 'bridges', [0, 0, -26], [11.2, 8.4, zOf(LV.bridge[1])]);
    const z0 = zOf(LV.bridge[1]);
    const z1 = zOf(LV.bridge[0]);
    const finish = () => [b.mat('bridge'), b.mat('bridgeSide'), b.mat('bridgeBevel')];
    for (const pts of [segsToPoints(barrelBridgeSegs()), segsToPoints(trainBridgeSegs())]) {
      const solid = extrudeZ(shapeOf(pts, sinks(pts, LV.bridge[1], ['barrel', 'train'])), z0, z1, 0.17);
      b.mesh(facetGroups(solid, BRIDGE_FACES, [0, 0, 1], 0.5), finish(), { receive: true });
    }
    // engraving, laid a hair above the stripes and read through the caseback
    // each watch's own calibre and jewel count, as its spec table states them
    const cal = ctx.spec.specs.find(([k]) => k === 'Calibre')?.[1] ?? 'V.31, 19 jewels';
    const engr = engravingTexture(ctx.textureSize, Number(/(\d+) jewels/.exec(cal)?.[1] ?? 19), cal.split(',')[0]);
    ctx.disposables.push(engr);
    const plane = new THREE.PlaneGeometry(DIAL_SPAN, DIAL_SPAN).rotateY(Math.PI).translate(0, 0, z0 - 0.012);
    const lacquer = new THREE.MeshStandardMaterial({ map: engr, transparent: true, alphaTest: 0.02, metalness: 0.35, roughness: 0.3, depthWrite: false });
    b.mesh(plane, ctx.mats.custom(lacquer, b.part.ink), { edges: false, cast: false });
    const dirP = angleTo(AX.pallet, PALLET_BRIDGE_END);
    const np = dirP + Math.PI / 2;
    const cap: P2[] = [
      ...[-90, -45, 0, 45, 90].map((a) => add(PALLET_BRIDGE_END, polar(0.72, dirP + a * DEG))),
      ...[90, 135, 180, 225, 270].map((a) => add(AX.pallet, polar(0.6, dirP + a * DEG))),
    ];
    void np;
    const palletB = merge([
      extrudeZ(shapeOf(cap), zOf(LV.palletBridge[1]), zOf(LV.palletBridge[0]), 0.05),
      cyl(0.6, zOf(LV.palletBridge[0]), zOf(0), 14, PALLET_BRIDGE_END),
    ]);
    b.mesh(palletB, 'bridgeSide');
    b.proxy(extrudeZ(shapeOf(segsToPoints(barrelBridgeSegs(), 18 * DEG)), z0, z1));
    b.proxy(extrudeZ(shapeOf(segsToPoints(trainBridgeSegs(), 18 * DEG)), z0, z1));
  }

  /* ---------------- ratchet and crown wheels ---------------- */
  {
    const b = part(ctx, 'keyless', [0, 0, -30.5], [AX.barrel[0] + 3.9, AX.barrel[1] + 3.2, zOf(LV.keyless[1])]);
    const z0 = zOf(LV.keyless[1]);
    const z1 = zOf(LV.keyless[0]);
    // both wheels carry a sunray: the light wheels round them as the watch turns
    const ratchet = extrudeZ(shapeOf(gearOutline(GEAR.ratchet, { add: 0.8, ded: 0.9 })), z0, z1, 0.06).translate(AX.barrel[0], AX.barrel[1], 0);
    const crownW = extrudeZ(shapeOf(gearOutline(GEAR.crownWheel, { add: 0.8, ded: 0.9 })), z0, z1, 0.06).translate(AX.crownWheel[0], AX.crownWheel[1], 0);
    b.mesh(merge([ratchet, crownW]), 'steelPolished');
    const face = (g: Gear, at: P2, inner: number) =>
      lathe([{ pts: [[inner, z0 - 0.006], [pitchR(g) - g.m * 1.15, z0 - 0.006]] }], 96).translate(at[0], at[1], 0);
    b.mesh(merge([face(GEAR.ratchet, AX.barrel, 2.6), face(GEAR.crownWheel, AX.crownWheel, 1.7)]), 'steelSunray', { edges: false, cast: false });
    const cores = merge([
      cyl(2.6, z0 - 0.08, z0, 32, AX.barrel),
      cyl(1.7, z0 - 0.08, z0, 28, AX.crownWheel),
    ]);
    b.mesh(cores, 'steelPolished');
    const clickAt = add(AX.barrel, polar(pitchR(GEAR.ratchet) + 1.3, 196 * DEG));
    const click: P2[] = [[-1.5, -0.45], [0.9, -0.6], [1.5, 0.1], [0.6, 0.62], [-1.5, 0.4]];
    const clickGeo = extrudeZ(shapeOf(click), z0, z1, 0.04);
    clickGeo.rotateZ(110 * DEG);
    clickGeo.translate(clickAt[0], clickAt[1], 0);
    b.mesh(clickGeo, 'steelPolished');
    b.proxy(cyl(5.0, z0, z1, 16, AX.barrel));
    b.proxy(cyl(3.4, z0, z1, 16, AX.crownWheel));
  }

  /* ---------------- jewels ---------------- */
  {
    const b = part(ctx, 'jewels', [0, 0, -34.5], [AX.fourth[0], AX.fourth[1], zOf(LV.bridge[1])]);
    const rubies: THREE.BufferGeometry[] = [];
    const chatons: THREE.BufferGeometry[] = [];
    const holes: THREE.BufferGeometry[] = [];
    for (const j of JEWELS) {
      const zt = zOf(j.level + 0.05);
      const zb = zOf(j.level - 0.5);
      const dome: P2[] = [[0.0001, zt], [j.r * 0.8, zt + 0.01], [j.r, zt + 0.06]];
      rubies.push(
        lathe([{ pts: dome, smooth: true }, { pts: [[j.r, zt + 0.06], [j.r, zb]] }, { pts: [[j.r, zb], [0.0001, zb]] }], 24).translate(j.at[0], j.at[1], 0),
      );
      holes.push(cyl(j.r * 0.24, zt - 0.02, zb + 0.02, 10, j.at));
      if (j.chaton) {
        chatons.push(
          lathe(
            [
              { pts: [[j.r + 0.34, zt + 0.04], [j.r + 0.34, zb + 0.1]] },
              { pts: [[j.r, zt + 0.04], [j.r + 0.34, zt + 0.04]] },
              { pts: [[j.r + 0.34, zb + 0.1], [j.r, zb + 0.1]] },
            ],
            24,
          ).translate(j.at[0], j.at[1], 0),
        );
      }
      b.proxy(cyl(j.r + 0.7, zt - 0.3, zb + 0.3, 10, j.at));
    }
    b.mesh(merge(rubies), 'ruby', { edges: 50 });
    b.mesh(merge(chatons), 'chaton', { edges: 50 });
    b.mesh(merge(holes), 'dark', { edges: false, cast: false });
  }

  /* ---------------- screws ---------------- */
  {
    const b = part(ctx, 'screws', [0, 0, -38], [SCREWS[0].at[0], SCREWS[0].at[1], zOf(LV.bridge[1] + 0.3)]);
    const heads: THREE.BufferGeometry[] = [];
    const slots: THREE.BufferGeometry[] = [];
    const shanks: THREE.BufferGeometry[] = [];
    SCREWS.forEach((s, i) => {
      const level =
        s.on === 'cock' ? LV.cock[1] : s.on === 'pallet' ? LV.palletBridge[1] : s.on === 'ratchet' || s.on === 'crown' ? LV.keyless[1] + 0.08 : LV.bridge[1];
      const r = s.on === 'ratchet' ? 1.05 : s.on === 'crown' ? 0.85 : s.on === 'pallet' ? 0.48 : 0.7;
      // bridge screws sit down in their sinks, a hair proud of the surface; the rest stand on what they hold
      const sunkIn = s.on === 'barrel' || s.on === 'train' || s.on === 'cock';
      const zt = zOf(level + (sunkIn ? 0.1 : 0.26));
      const zh = zOf(level - (sunkIn ? 0.36 : 0));
      heads.push(
        lathe([{ pts: [[0.0001, zt], [r * 0.86, zt]] }, { pts: [[r * 0.86, zt], [r, zt + 0.08]] }, { pts: [[r, zt + 0.08], [r, zh]] }], 24).translate(s.at[0], s.at[1], 0),
      );
      const slot = new THREE.BoxGeometry(r * 1.82, 0.17, 0.02);
      slot.rotateZ((i * 47 + 20) * DEG);
      slot.translate(s.at[0], s.at[1], zt - 0.012);
      slots.push(slot);
      shanks.push(cyl(r * 0.42, zh, zh + 1.5, 10, s.at));
      b.proxy(cyl(r + 0.5, zt - 0.3, zh + 1.5, 10, s.at));
    });
    b.mesh(merge(heads), 'bluedScrew', { edges: 50 });
    b.mesh(merge(slots), 'dark', { edges: false, cast: false });
    b.mesh(merge(shanks), 'steelFrosted', { edges: false });
  }

  return refs;
}
