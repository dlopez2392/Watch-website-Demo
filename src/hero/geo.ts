import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { P2 } from '../lib/calibre';
import { TAU } from '../lib/calibre';

export { mergeGeometries };

export interface Run {
  /** profile points as [radius, z], counter-clockwise around the solid */
  pts: P2[];
  /** material group index */
  mat?: number;
  /** average normals along the run (domes, fillets) instead of faceting it */
  smooth?: boolean;
}

/**
 * A lathe around the Z axis that keeps hard edges hard. Each run is shaded on its
 * own, so a polished bevel next to a brushed flank reads as two surfaces.
 */
export function lathe(runs: Run[], segs = 96, opts: { planarUV?: number } = {}): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const g = new THREE.BufferGeometry();
  let base = 0;

  const strip = (pts: P2[], normals: P2[], mat: number) => {
    const m = pts.length;
    let total = 0;
    const acc = [0];
    for (let j = 1; j < m; j++) {
      total += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      acc.push(total);
    }
    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * TAU;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      for (let j = 0; j < m; j++) {
        const [r, z] = pts[j];
        const [nr, nz] = normals[j];
        pos.push(r * c, r * s, z);
        nor.push(nr * c, nr * s, nz);
        if (opts.planarUV) uv.push((r * c) / opts.planarUV, (r * s) / opts.planarUV);
        else uv.push(i / segs, total > 0 ? acc[j] / total : 0);
      }
    }
    const start = idx.length;
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < m - 1; j++) {
        const a = base + i * m + j;
        const b = base + (i + 1) * m + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    g.addGroup(start, idx.length - start, mat);
    base += (segs + 1) * m;
  };

  const segNormal = (a: P2, b: P2): P2 => {
    const dr = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dr, dz) || 1;
    return [dz / l, -dr / l];
  };

  for (const run of runs) {
    const { pts } = run;
    const mat = run.mat ?? 0;
    if (run.smooth && pts.length > 2) {
      const sn = pts.slice(0, -1).map((p, j) => segNormal(p, pts[j + 1]));
      const normals = pts.map((_, j) => {
        const a = sn[Math.max(0, j - 1)];
        const b = sn[Math.min(sn.length - 1, j)];
        const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
        return [(a[0] + b[0]) / l, (a[1] + b[1]) / l] as P2;
      });
      strip(pts, normals, mat);
    } else {
      for (let j = 0; j < pts.length - 1; j++) {
        const n = segNormal(pts[j], pts[j + 1]);
        strip([pts[j], pts[j + 1]], [n, n], mat);
      }
    }
  }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Points of an arc; handy for domes and fillets in lathe profiles. */
export function arcPts(c: P2, r: number, a0: number, a1: number, n: number): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return pts;
}

export const circlePts = (r: number, n = 64, c: P2 = [0, 0], a0 = 0): P2[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * TAU;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as P2;
  });

export function shapeOf(pts: P2[], holes: P2[][] = []): THREE.Shape {
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  for (const h of holes) s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))));
  return s;
}

/** Extrude along Z between z0 and z1. The bevel stays inside the outline, like a hand-cut anglage. */
export function extrudeZ(shape: THREE.Shape, z0: number, z1: number, bevel = 0): THREE.BufferGeometry {
  const lo = Math.min(z0, z1);
  const depth = Math.abs(z1 - z0);
  const b = Math.min(bevel, depth * 0.45);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * b,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 1,
    curveSegments: 16,
  });
  g.translate(0, 0, lo + b);
  return g;
}

/** Windows between the spokes of a wheel. */
export function spokeWindows(rimIn: number, hubR: number, spokes: number, spokeW: number, phase = 0): P2[][] {
  const holes: P2[][] = [];
  const dOut = Math.asin(spokeW / 2 / rimIn);
  const dIn = Math.asin(Math.min(0.95, spokeW / 2 / hubR));
  const step = TAU / spokes;
  for (let k = 0; k < spokes; k++) {
    const a0 = phase + k * step;
    const a1 = a0 + step;
    const pts: P2[] = [];
    const n = Math.max(6, Math.round(48 / spokes));
    for (let i = 0; i <= n; i++) {
      const a = a0 + dOut + ((a1 - dOut - (a0 + dOut)) * i) / n;
      pts.push([rimIn * Math.cos(a), rimIn * Math.sin(a)]);
    }
    for (let i = n; i >= 0; i--) {
      const a = a0 + dIn + ((a1 - dIn - (a0 + dIn)) * i) / n;
      pts.push([hubR * Math.cos(a), hubR * Math.sin(a)]);
    }
    holes.push(pts);
  }
  return holes;
}

/** A flat strip standing on edge along a 2D polyline: springs. */
export function ribbon(pts: P2[], z0: number, z1: number, thick: number): THREE.BufferGeometry {
  const n = pts.length;
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const normals: P2[] = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dy / l, -dx / l];
  });
  const h = thick / 2;
  // four faces, each with its own vertices so the edges stay crisp
  const faces: { off: [number, number]; zs: [number, number]; n: (nn: P2) => [number, number, number] }[] = [
    { off: [h, h], zs: [z0, z1], n: (nn) => [nn[0], nn[1], 0] },
    { off: [-h, -h], zs: [z1, z0], n: (nn) => [-nn[0], -nn[1], 0] },
    { off: [h, -h], zs: [z1, z1], n: () => [0, 0, 1] },
    { off: [-h, h], zs: [z0, z0], n: () => [0, 0, -1] },
  ];
  let base = 0;
  for (const f of faces) {
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[i];
      const nn = normals[i];
      const fn = f.n(nn);
      pos.push(x + nn[0] * f.off[0], y + nn[1] * f.off[0], f.zs[0]);
      pos.push(x + nn[0] * f.off[1], y + nn[1] * f.off[1], f.zs[1]);
      nor.push(...fn, ...fn);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
    base += n * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  return g;
}

export interface Frame {
  p: THREE.Vector3;
  /** outward normal */
  n: THREE.Vector3;
  /** across the width */
  b: THREE.Vector3;
  width: number;
  thick: number;
}

/** Sweep a soft rounded rectangle along a list of frames: straps and keepers. */
export function sweep(frames: Frame[], closedEnds = true): THREE.BufferGeometry {
  // cross-section in (across, out) coordinates, unit size, padded on the outer face
  const sec: [number, number][] = [
    [0.44, -0.5], [0.485, -0.38], [0.5, -0.15], [0.5, 0.15], [0.485, 0.38], [0.44, 0.5],
    [0.25, 0.56], [0, 0.58], [-0.25, 0.56],
    [-0.44, 0.5], [-0.485, 0.38], [-0.5, 0.15], [-0.5, -0.15], [-0.485, -0.38], [-0.44, -0.5],
    [0, -0.5],
  ];
  const m = sec.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let dist = 0;
  frames.forEach((f, i) => {
    if (i > 0) dist += f.p.distanceTo(frames[i - 1].p);
    for (let j = 0; j < m; j++) {
      const [sx, sy] = sec[j];
      const v = f.p
        .clone()
        .addScaledVector(f.b, sx * f.width)
        .addScaledVector(f.n, sy * f.thick);
      pos.push(v.x, v.y, v.z);
      uv.push(sx + 0.5, dist / 20);
    }
  });
  for (let i = 0; i < frames.length - 1; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * m + j;
      const b = i * m + ((j + 1) % m);
      const c = (i + 1) * m + j;
      const d = (i + 1) * m + ((j + 1) % m);
      idx.push(a, c, b, b, c, d);
    }
  }
  if (closedEnds) {
    for (const [fi, flip] of [
      [0, false],
      [frames.length - 1, true],
    ] as [number, boolean][]) {
      const f = frames[fi];
      const centre = pos.length / 3;
      pos.push(f.p.x, f.p.y, f.p.z);
      uv.push(0.5, 0);
      for (let j = 0; j < m; j++) {
        const a = fi * m + j;
        const b = fi * m + ((j + 1) % m);
        if (flip) idx.push(centre, a, b);
        else idx.push(centre, b, a);
      }
    }
  }
  // make sure the skin faces outwards whatever the direction of travel
  {
    const f0 = frames[0];
    const pa = new THREE.Vector3(pos[idx[0] * 3], pos[idx[0] * 3 + 1], pos[idx[0] * 3 + 2]);
    const pb = new THREE.Vector3(pos[idx[1] * 3], pos[idx[1] * 3 + 1], pos[idx[1] * 3 + 2]);
    const pc = new THREE.Vector3(pos[idx[2] * 3], pos[idx[2] * 3 + 1], pos[idx[2] * 3 + 2]);
    const fn = pb.clone().sub(pa).cross(pc.clone().sub(pa));
    const out = pa.clone().add(pb).add(pc).multiplyScalar(1 / 3).sub(f0.p.clone().lerp(frames[1].p, 0.33));
    if (fn.dot(out) < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Map shape-plane (x, y, extrude) onto (y, z, x): for side profiles such as lugs. */
export const SIDE_PROFILE = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0),
);

export function cyl(r: number, z0: number, z1: number, segs = 32, at: P2 = [0, 0]): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), segs);
  g.rotateX(Math.PI / 2);
  g.translate(at[0], at[1], (z0 + z1) / 2);
  return g;
}

export function planarUV(g: THREE.BufferGeometry, scale: number): THREE.BufferGeometry {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / scale;
    uv[i * 2 + 1] = p.getY(i) / scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = list.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    c.clearGroups();
    for (const name of Object.keys(c.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) c.deleteAttribute(name);
    }
    if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    return c;
  });
  const out = mergeGeometries(clean, false);
  clean.forEach((c) => c.dispose());
  return out!;
}

/* ------------------------------------------------------------------ finishing */

type V3 = [number, number, number];

/**
 * Sort the triangles of a solid into material groups by how each face sits against an axis:
 * the flat face looking along +axis, the flat face looking along -axis, the walls, and the bevels
 * between them. This is what lets a bridge carry stripes on top, a satin flank and a polished anglage.
 * `smooth` (radians) rounds the shading along curved walls and bevels while keeping every arris sharp.
 */
export function facetGroups(
  geo: THREE.BufferGeometry,
  map: { plus: number; minus: number; wall: number; bevel: number },
  axis: V3 = [0, 0, 1],
  smooth = 0,
): THREE.BufferGeometry {
  let src = geo.index ? geo.toNonIndexed() : geo;
  if (smooth > 0) src = toCreasedNormals(src, smooth);
  const p = src.attributes.position;
  const n = src.attributes.normal;
  const uv = src.attributes.uv;
  const buckets: number[][] = [[], [], [], []];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ax = new THREE.Vector3(...axis);
  for (let t = 0; t < p.count; t += 3) {
    a.fromBufferAttribute(p, t);
    b.fromBufferAttribute(p, t + 1);
    c.fromBufferAttribute(p, t + 2);
    const fn = b.sub(a).cross(c.sub(a)).normalize();
    const d = fn.dot(ax);
    const k = d > 0.93 ? 0 : d < -0.93 ? 1 : Math.abs(d) < 0.1 ? 2 : 3;
    buckets[k].push(t);
  }
  const count = p.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const out = new THREE.BufferGeometry();
  const mats = [map.plus, map.minus, map.wall, map.bevel];
  let w = 0;
  buckets.forEach((list, k) => {
    const start = w;
    for (const t of list) {
      for (let i = 0; i < 3; i++) {
        pos.set([p.getX(t + i), p.getY(t + i), p.getZ(t + i)], w * 3);
        nor.set([n.getX(t + i), n.getY(t + i), n.getZ(t + i)], w * 3);
        if (uv) uvs.set([uv.getX(t + i), uv.getY(t + i)], w * 2);
        w++;
      }
    }
    if (w > start) out.addGroup(start, w - start, mats[k]);
  });
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return out;
}

/** Planar texture coordinates from two of the model axes, in millimetres over `scale`. */
export function axisUV(g: THREE.BufferGeometry, u: 0 | 1 | 2, v: 0 | 1 | 2, scale: number, offset: [number, number] = [0, 0]): THREE.BufferGeometry {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getComponent(i, u) / scale + offset[0];
    uv[i * 2 + 1] = p.getComponent(i, v) / scale + offset[1];
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** A strip of quads between two rails, shaded smoothly along its length and facing `expect`. */
function strip(a: V3[], b: V3[], expect: V3): THREE.BufferGeometry {
  const n = a.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) pos.push(...a[i], ...b[i]);
  for (let i = 0; i < n - 1; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const nn = g.attributes.normal;
  let d = 0;
  for (let i = 0; i < nn.count; i++) d += nn.getX(i) * expect[0] + nn.getY(i) * expect[1] + nn.getZ(i) * expect[2];
  if (d < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  return g;
}

/**
 * A hand as a watchmaker files it: two polished flanks meeting at a ridge down the middle, so one
 * half takes the light while the other stays dark. `right` is the right-hand edge as [half-width, y].
 */
export function ridgeBlade(right: P2[], z: number, edge: number, ridge: number): THREE.BufferGeometry {
  const wMax = Math.max(...right.map((p) => p[0]));
  const R: V3[] = [];
  const L: V3[] = [];
  const C: V3[] = [];
  const Rb: V3[] = [];
  const Lb: V3[] = [];
  for (const [hw, y] of right) {
    const h = edge + (ridge - edge) * Math.sqrt(Math.min(1, hw / wMax));
    R.push([hw, y, z + edge]);
    L.push([-hw, y, z + edge]);
    C.push([0, y, z + Math.max(h, edge + 0.004)]);
    Rb.push([hw, y, z]);
    Lb.push([-hw, y, z]);
  }
  return merge([strip(C, R, [0.4, 0, 1]), strip(C, L, [-0.4, 0, 1]), strip(R, Rb, [1, 0, 0]), strip(L, Lb, [-1, 0, 0]), strip(Lb, Rb, [0, 0, -1])]);
}

/** An applied index: a bar with a roof, hipped at both ends, lying along +x from x0 to x1 on the plane z. */
export function gableBar(x0: number, x1: number, width: number, z: number, eave: number, ridge: number): THREE.BufferGeometry {
  const w = width / 2;
  const hip = Math.min(w, (x1 - x0) * 0.25);
  const v: V3[] = [
    [x0, -w, z], [x1, -w, z], [x1, w, z], [x0, w, z],
    [x0, -w, z + eave], [x1, -w, z + eave], [x1, w, z + eave], [x0, w, z + eave],
    [x0 + hip, 0, z + ridge], [x1 - hip, 0, z + ridge],
  ];
  const faces: number[][] = [
    [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
    [4, 5, 9, 8], [6, 7, 8, 9], [5, 6, 9], [7, 4, 8], [3, 2, 1, 0],
  ];
  const pos: number[] = [];
  for (const f of faces) {
    for (let i = 1; i < f.length - 1; i++) pos.push(...v[f[0]], ...v[f[i]], ...v[f[i + 1]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  return g;
}

export function pointInPoly(pt: P2, poly: P2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when a whole disc lies inside an outline, with room to spare. */
export function discInPoly(c: P2, r: number, poly: P2[]): boolean {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    if (!pointInPoly([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)], poly)) return false;
  }
  return true;
}

/** Texture coordinates about the Z axis: u runs round, v along the radius. For graining turned on a lathe. */
export function polarUV(geo: THREE.BufferGeometry, radial = 10): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let t = 0; t < p.count; t += 3) {
    const us = [0, 1, 2].map((i) => Math.atan2(p.getY(t + i), p.getX(t + i)) / TAU + 0.5);
    const hi = Math.max(...us);
    for (let i = 0; i < 3; i++) {
      // keep a triangle that straddles the seam on one side of it
      uv[(t + i) * 2] = hi - us[i] > 0.5 ? us[i] + 1 : us[i];
      uv[(t + i) * 2 + 1] = Math.hypot(p.getX(t + i), p.getY(t + i)) / radial;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
