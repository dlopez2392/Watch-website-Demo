import * as THREE from 'three';
import { trainAt } from '../lib/calibre';
import type { WatchSpec } from '../lib/watches';
import { buildExterior, type Ctx, type ExteriorRefs } from './buildExterior';
import { buildMovement, type MovementRefs } from './buildMovement';
import { createMaterials, INK } from './materials';
import { PART_ORDER, type Part, type PartId } from './parts';

export interface WatchModel {
  root: THREE.Group;
  parts: Part[];
  byId: Map<PartId, Part>;
  /** set the hands and the going train to wall-clock time t (seconds since midnight) */
  tick(t: number): void;
  /** per-part explosion (0..1), with a slow drift about the axis */
  pose(explode: (p: Part) => number, drift: (p: Part) => number): void;
  /** ink amount, line weight and hover tint for every part */
  ink(amount: (p: Part) => number, dpr: number, w: number, h: number): void;
  /** how strongly the sapphire reflects the studio: high when the crystal floats alone, low over the dial */
  glass(k: number): void;
  dispose(): void;
}

const SANGUINE = INK.sanguine.clone();
const SEPIA = INK.line.clone();

export function buildWatch(spec: WatchSpec, opts: { movement: boolean; detail: number; textureSize: number }): WatchModel {
  const mats = createMaterials();
  const ctx: Ctx = { spec, mats, detail: opts.detail, textureSize: opts.textureSize, parts: [], disposables: [], glass: [] };
  const ext: ExteriorRefs = buildExterior(ctx);
  const mov: MovementRefs | null = opts.movement ? buildMovement(ctx) : null;

  const root = new THREE.Group();
  root.name = spec.id;
  const parts = PART_ORDER.map((id) => ctx.parts.find((p) => p.id === id)).filter(Boolean) as Part[];
  parts.forEach((p, i) => {
    p.order = parts.length > 1 ? i / (parts.length - 1) : 0;
    root.add(p.group);
  });
  const byId = new Map(parts.map((p) => [p.id, p]));

  const tick = (t: number) => {
    const s = trainAt(t);
    ext.hour.rotation.z = s.hour;
    ext.minute.rotation.z = s.minute;
    if (ext.smallSeconds) ext.smallSeconds.rotation.z = s.second;
    if (ext.centreSeconds) ext.centreSeconds.rotation.z = s.second;
    if (ext.gmt) ext.gmt.rotation.z = s.hour / 2 - 1.9;
    if (mov) {
      mov.barrel.rotation.z = s.barrel;
      mov.centre.rotation.z = s.centre;
      mov.third.rotation.z = s.third;
      mov.fourth.rotation.z = s.fourth;
      mov.escape.rotation.z = s.escape;
      mov.pallet.rotation.z = mov.palletRest + s.pallet;
      mov.balance.rotation.z = s.balance;
      mov.hairspring.rotation.z = s.balance * 0.1;
      const k = 1 - 0.04 * s.breath;
      mov.hairspring.scale.set(k, k, 1);
    }
  };

  const pose: WatchModel['pose'] = (explode, drift) => {
    for (const p of parts) {
      const e = explode(p);
      p.group.position.copy(p.explode).multiplyScalar(e);
      p.group.rotation.z = drift(p);
      p.inner?.(e);
    }
  };

  const tmp = new THREE.Color();
  const ink: WatchModel['ink'] = (amount, dpr, w, h) => {
    for (const p of parts) {
      const a = amount(p);
      p.ink.value = a;
      const lineOpacity = Math.max(a * 0.95, p.hover * 0.95);
      p.lineMat.opacity = lineOpacity;
      p.lineMat.linewidth = (1.05 + p.hover * 0.5) * dpr;
      p.lineMat.resolution.set(w, h);
      tmp.copy(SEPIA).lerp(SANGUINE, p.hover);
      p.lineMat.color.copy(tmp);
      const show = lineOpacity > 0.015;
      for (const l of p.lines) l.visible = show;
    }
  };

  const dispose = () => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    parts.forEach((p) => p.lineMat.dispose());
    ctx.disposables.forEach((d) => d.dispose());
    mats.dispose();
  };

  const glass = (k: number) => {
    // specular intensity, not envMapIntensity: the latter no longer applies to scene.environment
    for (const m of ctx.glass) m.specularIntensity = k;
  };

  return { root, parts, byId, tick, pose, ink, glass, dispose };
}
