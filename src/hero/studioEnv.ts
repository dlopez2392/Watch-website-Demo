import * as THREE from 'three';

/**
 * The studio, painted as an HDR panorama in code and prefiltered once.
 *
 * Polished metal is only ever a picture of what surrounds it, so the surroundings are designed:
 * a dark room, a broad soft key, a graded sweep overhead for the flat faces of wheels and bridges
 * to catch, two hard strips for the edges of the case, and warm parchment below and behind,
 * where the page is. Soft edges throughout; nothing here should read as a rectangle.
 */

type V3 = [number, number, number];
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Card {
  dir: V3;
  /** half-extents, as tangents of the half-angles */
  w: number;
  h: number;
  /** 0 = hard edge, 1 = falls off from the centre */
  soft: number;
  color: V3;
  /** radiance; 0 with `flag` darkens instead */
  power: number;
  flag?: number;
  roll?: number;
}

function cardMask(d: V3, c: Card): number {
  const n = norm(c.dir);
  const k = dot(d, n);
  if (k <= 0.02) return 0;
  const upGuess: V3 = Math.abs(n[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  let right = norm(cross(upGuess, n));
  let up = cross(n, right);
  if (c.roll) {
    const cs = Math.cos(c.roll);
    const sn = Math.sin(c.roll);
    const r2: V3 = [right[0] * cs + up[0] * sn, right[1] * cs + up[1] * sn, right[2] * cs + up[2] * sn];
    up = [up[0] * cs - right[0] * sn, up[1] * cs - right[1] * sn, up[2] * cs - right[2] * sn];
    right = r2;
  }
  const x = Math.abs(dot(d, right) / k);
  const y = Math.abs(dot(d, up) / k);
  return (1 - smooth(c.w * (1 - c.soft), c.w, x)) * (1 - smooth(c.h * (1 - c.soft), c.h, y));
}

const PAPER: V3 = [0.93, 0.85, 0.7];

function cards(dark: boolean): Card[] {
  return [
    // key: broad and soft, upper left, in front
    { dir: [-0.58, 0.6, 0.55], w: 0.62, h: 0.46, soft: 0.6, color: [1, 0.95, 0.87], power: dark ? 3.4 : 3.5 },
    // the sweep overhead and behind: what a dial-up disc reflects. Graded, so stripes and graining show
    { dir: [0.05, 0.9, -0.42], w: 1.25, h: 0.42, soft: 0.85, color: [1, 0.97, 0.92], power: dark ? 0.6 : 0.62 },
    // hard strips: the bright lines along a polished bevel
    { dir: [0.97, 0.1, 0.22], w: 0.055, h: 1.1, soft: 0.25, color: [1, 1, 1], power: 20 },
    { dir: [-0.92, -0.08, -0.38], w: 0.05, h: 0.9, soft: 0.25, color: [0.78, 0.86, 1], power: 10 },
    { dir: [0.1, 0.99, 0.12], w: 0.9, h: 0.045, soft: 0.3, color: [1, 1, 1], power: 12 },
    // a small hot kicker for sparkle on jewels and screw heads
    { dir: [0.32, 0.48, 0.82], w: 0.07, h: 0.07, soft: 0.5, color: [1, 1, 1], power: 16 },
    // low warm fill from the front
    { dir: [0.2, -0.5, 0.84], w: 0.8, h: 0.3, soft: 0.8, color: [1, 0.9, 0.78], power: dark ? 0.9 : 1.5 },
    // flags: darkness with a shape, so steel has an edge to it
    { dir: [0.66, 0.34, 0.67], w: 0.2, h: 0.75, soft: 0.5, color: [0, 0, 0], power: 0, flag: 0.92 },
    { dir: [-0.15, -0.2, 0.97], w: 0.5, h: 0.16, soft: 0.6, color: [0, 0, 0], power: 0, flag: 0.8 },
    { dir: [-0.95, 0.3, 0.1], w: 0.14, h: 0.6, soft: 0.5, color: [0, 0, 0], power: 0, flag: 0.85 },
  ];
}

export function studioRadiance(d: V3, list: Card[], dark: boolean): V3 {
  // the room
  const t = d[1] * 0.5 + 0.5;
  const room = 0.03 + 0.1 * smooth(0.25, 1, t);
  let r = room * 1.02;
  let g = room * 0.98;
  let b = room * 0.94;
  // the page, behind and below
  const page = smooth(-0.05, 0.75, -d[2]) * (0.28 + 0.5 * smooth(-0.6, 0.7, d[1]));
  const pageTone: V3 = dark ? [0.2, 0.25, 0.42] : PAPER;
  const pagePower = dark ? 0.4 : 0.44;
  r += pageTone[0] * page * pagePower;
  g += pageTone[1] * page * pagePower;
  b += pageTone[2] * page * pagePower;
  for (const c of list) {
    if (!c.flag) continue;
    const m = 1 - c.flag * cardMask(d, c);
    r *= m;
    g *= m;
    b *= m;
  }
  for (const c of list) {
    if (c.flag) continue;
    const m = cardMask(d, c) * c.power;
    r += c.color[0] * m;
    g += c.color[1] * m;
    b += c.color[2] * m;
  }
  return [r, g, b];
}

export function createStudioEnvironment(renderer: THREE.WebGLRenderer, dark = false, size = 512): THREE.WebGLRenderTarget {
  const w = size;
  const h = size / 2;
  const data = new Uint16Array(w * h * 4);
  const list = cards(dark);
  const one = THREE.DataUtils.toHalfFloat(1);
  for (let j = 0; j < h; j++) {
    const lat = ((j + 0.5) / h - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    for (let i = 0; i < w; i++) {
      const phi = ((i + 0.5) / w - 0.5) * Math.PI * 2;
      const rad = studioRadiance([cl * Math.cos(phi), sl, cl * Math.sin(phi)], list, dark);
      const o = (j * w + i) * 4;
      data[o] = THREE.DataUtils.toHalfFloat(Math.min(rad[0], 60));
      data[o + 1] = THREE.DataUtils.toHalfFloat(Math.min(rad[1], 60));
      data[o + 2] = THREE.DataUtils.toHalfFloat(Math.min(rad[2], 60));
      data[o + 3] = one;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return target;
}
