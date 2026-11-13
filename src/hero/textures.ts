import * as THREE from 'three';
import type { DialSpec } from '../lib/watches';

/** Every surface map is drawn in code, so the whole watch is one consistent hand. */

const SERIF = '"Cormorant Garamond", "Cormorant", Georgia, serif';
const SANS = '"Jost Variable", "Jost", "Helvetica Neue", sans-serif';

export async function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`600 40px ${SERIF}`),
      document.fonts.load(`500 40px ${SERIF}`),
      document.fonts.load(`500 40px ${SANS}`),
      document.fonts.load(`400 40px ${SANS}`),
    ]);
  } catch {
    /* draw with fallbacks */
  }
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function asTexture(c: HTMLCanvasElement, color: boolean, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Fine parallel scratches: brushed steel. Reads as roughness and as a faint bump. */
export function brushedTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 256);
  const r = rng(11);
  g.fillStyle = 'rgb(205,205,205)';
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2600; i++) {
    const y = r() * 256;
    const x = r() * 512;
    const l = 40 + r() * 320;
    const v = r() > 0.5 ? 255 : 120;
    g.strokeStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.2})`;
    g.lineWidth = 0.5 + r() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + l, y);
    g.moveTo(x - 512, y);
    g.lineTo(x + l - 512, y);
    g.stroke();
  }
  return asTexture(c, false);
}

/** Perlage: rows of overlapping circular grains, each laid over the last, as on a mainplate. */
export function perlageTexture(): THREE.CanvasTexture {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = 'rgb(196,196,196)';
  g.fillRect(0, 0, S, S);
  const n = 8;
  const step = S / n;
  const R = step * 0.86;
  for (let j = -1; j <= n + 1; j++) {
    for (let i = -1; i <= n + 1; i++) {
      const cx = i * step + (j % 2 ? step / 2 : 0);
      const cy = j * step;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      grad.addColorStop(0, 'rgb(184,184,184)');
      grad.addColorStop(0.5, 'rgb(214,214,214)');
      grad.addColorStop(0.86, 'rgb(190,190,190)');
      grad.addColorStop(1, 'rgb(158,158,158)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 1;
      for (let k = 1; k < 5; k++) {
        g.beginPath();
        g.arc(cx, cy, (R * k) / 5, 0, Math.PI * 2);
        g.stroke();
      }
    }
  }
  return asTexture(c, false);
}

/** Côtes de Genève: soft parallel waves across the bridges. */
export function stripesTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 64);
  const r = rng(5);
  const img = g.createImageData(256, 64);
  for (let x = 0; x < 256; x++) {
    const u = (x / 256) % 1;
    const wave = Math.pow(Math.abs(Math.sin(u * Math.PI)), 0.6);
    for (let y = 0; y < 64; y++) {
      const v = 150 + wave * 80 + (r() - 0.5) * 22;
      const i = (y * 256 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return asTexture(c, false);
}

/** Calf grain: pores, and the fine creases that run between them. */
export function leatherTexture(): THREE.CanvasTexture {
  const S = 512;
  const [c, g] = canvas(S, S);
  const r = rng(23);
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, S, S);
  // creases: short wandering lines, drawn twice so they tile
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    let x = r() * S;
    let y = r() * S;
    let a = r() * Math.PI * 2;
    g.strokeStyle = `rgba(30,30,30,${0.1 + r() * 0.16})`;
    g.lineWidth = 0.7 + r() * 1.1;
    g.beginPath();
    g.moveTo(x, y);
    const n = 3 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      a += (r() - 0.5) * 1.3;
      x += Math.cos(a) * (5 + r() * 9);
      y += Math.sin(a) * (5 + r() * 9);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 9000; i++) {
    const v = r() > 0.62 ? 215 : 40;
    g.fillStyle = `rgba(${v},${v},${v},${0.1 + r() * 0.2})`;
    const s = 0.7 + r() * 2.0;
    g.beginPath();
    g.ellipse(r() * S, r() * S, s, s * (0.5 + r() * 0.8), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return asTexture(c, false);
}

/**
 * Sailcloth: a plain weave, sixteen threads to the tile, each over one and under the next.
 * Read as a bump and roughness map; the threads rise in the middle and dip where they cross under.
 */
export function weaveTexture(): THREE.CanvasTexture {
  const S = 512;
  const N = 16;
  const p = S / N;
  const [c, g] = canvas(S, S);
  const r = rng(41);
  g.fillStyle = 'rgb(60,60,60)';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const warpOver = (i + j) % 2 === 0;
      const x = i * p;
      const y = j * p;
      const jitter = (r() - 0.5) * 18;
      // the thread on top, rounded across its width
      const grad = warpOver ? g.createLinearGradient(x, 0, x + p, 0) : g.createLinearGradient(0, y, 0, y + p);
      const hi = 205 + jitter;
      grad.addColorStop(0, 'rgb(70,70,70)');
      grad.addColorStop(0.5, `rgb(${hi},${hi},${hi})`);
      grad.addColorStop(1, 'rgb(70,70,70)');
      g.fillStyle = grad;
      if (warpOver) g.fillRect(x + p * 0.06, y, p * 0.88, p);
      else g.fillRect(x, y + p * 0.06, p, p * 0.88);
    }
  }
  // stray fibres
  for (let i = 0; i < 1400; i++) {
    g.strokeStyle = `rgba(230,230,230,${0.05 + r() * 0.1})`;
    g.lineWidth = 0.6;
    const x = r() * S;
    const y = r() * S;
    const a = r() > 0.5 ? 0 : Math.PI / 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * (4 + r() * 10), y + Math.sin(a) * (4 + r() * 10));
    g.stroke();
  }
  return asTexture(c, false);
}

/** Strap face: dyed calf, darker where the edges were burnished, saddle-stitched down both sides; or woven cloth with folded edges. */
export function strapTexture(color: string, stitch: string, cloth = false): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const [c, g] = canvas(W, H);
  const r = rng(31);
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  // the dye is never even: slow mottling
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 30 + r() * 80;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    const light = r() > 0.5;
    grad.addColorStop(0, light ? (cloth ? 'rgba(200,215,255,0.05)' : 'rgba(255,225,190,0.07)') : cloth ? 'rgba(0,0,8,0.08)' : 'rgba(30,14,4,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? (cloth ? '210,220,245' : '255,235,210') : cloth ? '0,0,6' : '20,8,0'},${0.03 + r() * 0.07})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  // burnished edges
  for (const [x0, x1] of [
    [0, 34],
    [W, W - 34],
  ]) {
    const grad = g.createLinearGradient(x0, 0, x1, 0);
    // calf is burnished dark at the edge; cloth is folded under, and only a little darker
    const e = cloth ? '0,0,6' : '24,10,2';
    grad.addColorStop(0, `rgba(${e},${cloth ? 0.35 : 0.62})`);
    grad.addColorStop(0.3, `rgba(${e},${cloth ? 0.08 : 0.22})`);
    grad.addColorStop(1, `rgba(${e},0)`);
    g.fillStyle = grad;
    g.fillRect(Math.min(x0, x1), 0, 34, H);
  }
  if (stitch !== color) {
    // the groove the stitches lie in, then each stitch slanted, with its hole at either end
    // the canvas is twice as fine along the strap as across it
    const pitch = 64;
    for (const x of [31, W - 31]) {
      g.strokeStyle = 'rgba(20,8,0,0.3)';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
      for (let y = 4; y < H; y += pitch) {
        g.fillStyle = 'rgba(12,5,0,0.7)';
        g.beginPath();
        g.ellipse(x - 3, y, 2.6, 5, 0, 0, Math.PI * 2);
        g.ellipse(x + 3, y + pitch * 0.62, 2.6, 5, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(20,8,0,0.35)';
        g.lineWidth = 6.6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 2, y + 5);
        g.lineTo(x + 4, y + pitch * 0.62 - 2);
        g.stroke();
        g.strokeStyle = stitch;
        g.lineWidth = 4.2;
        g.beginPath();
        g.moveTo(x - 3, y + 4);
        g.lineTo(x + 3, y + pitch * 0.62 - 4);
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.28)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x - 3.8, y + 7);
        g.lineTo(x + 1.6, y + pitch * 0.62 - 6);
        g.stroke();
      }
    }
  } else {
    // sailcloth weave
    g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.lineWidth = 1.4;
    for (let y = 0; y < H; y += 6) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    for (let x = 0; x < W; x += 6) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
  }
  return asTexture(c, true);
}

/* ------------------------------------------------------------------ dials */

const DIAL_R = 16.3;

interface Pen {
  g: CanvasRenderingContext2D;
  k: number;
  S: number;
}

function pen(S: number): [HTMLCanvasElement, Pen] {
  const [c, g] = canvas(S, S);
  const k = S / (DIAL_R * 2);
  g.translate(S / 2, S / 2);
  g.scale(k, -k); // millimetres, y up
  return [c, { g, k, S }];
}

const ring = (g: CanvasRenderingContext2D, r: number, w: number, color: string) => {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
};

function ticks(g: CanvasRenderingContext2D, n: number, r0: number, r1: number, w: number, color: string, skip?: (i: number) => boolean) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'butt';
  for (let i = 0; i < n; i++) {
    if (skip?.(i)) continue;
    const a = Math.PI / 2 - (i / n) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }
}

/** Text in millimetres. `rot` turns the baseline; letters are spaced by hand for tracking. */
function label(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  font: string,
  color: string,
  tracking = 0,
  rot = 0,
) {
  // drawn at 100x and scaled down: sub-pixel font sizes are not dependable in canvas
  const U = 100;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1 / U, -1 / U);
  g.font = font.replace('SIZE', `${size * U}px`);
  g.fillStyle = color;
  g.textBaseline = 'middle';
  if (!tracking) {
    g.textAlign = 'center';
    g.fillText(text, 0, 0);
  } else {
    const widths = [...text].map((ch) => g.measureText(ch).width);
    const gap = tracking * size * U;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
    let cx = -total / 2;
    g.textAlign = 'left';
    [...text].forEach((ch, i) => {
      g.fillText(ch, cx, 0);
      cx += widths[i] + gap;
    });
  }
  g.restore();
}

function grain(p: Pen, amount: number, seed: number) {
  const { g, S } = p;
  const r = rng(seed);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < S * 26; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '40,30,20'},${r() * amount})`;
    g.fillRect(r() * S, r() * S, 1.2, 1.2);
  }
  g.restore();
}

const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const SUB: [number, number] = [0, -8.6];

export interface DialOpts {
  /** the hour indexes are applied in metal, so they are not printed */
  applied?: boolean;
  /** the seconds dial is a real well in the dial, so its lip and shadow are not painted */
  sunk?: boolean;
}

function subSeconds(p: Pen, d: DialSpec, sunk = false) {
  const { g } = p;
  const R = sunk ? 4.1 : 4.3;
  g.save();
  g.translate(SUB[0], SUB[1]);
  g.fillStyle = d.ring;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  // azurage: fine concentric rings
  if (sunk) {
    // the well itself: a touch of shade where the wall meets the floor, heaviest towards the light
    g.fillStyle = d.ring;
    g.beginPath();
    g.arc(0, 0, 4.4, 0, Math.PI * 2);
    g.fill();
    const sh = g.createRadialGradient(-0.5, 0.7, 2.9, 0, 0, 4.2);
    sh.addColorStop(0, 'rgba(40,28,18,0)');
    sh.addColorStop(1, 'rgba(40,28,18,0.3)');
    g.fillStyle = sh;
    g.beginPath();
    g.arc(0, 0, 4.4, 0, Math.PI * 2);
    g.fill();
  } else {
    for (let r = 0.3; r < R - 0.55; r += 0.115) ring(g, r, 0.035, 'rgba(60,45,30,0.16)');
    // a soft shadow under the upper lip, so the sub-dial reads as sunk
    const sh = g.createLinearGradient(0, R, 0, R - 1.3);
    sh.addColorStop(0, 'rgba(40,28,18,0.34)');
    sh.addColorStop(1, 'rgba(40,28,18,0)');
    g.strokeStyle = sh;
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(0, 0, R - 0.42, 0.05 * Math.PI, 0.95 * Math.PI);
    g.stroke();
    ring(g, R, 0.11, d.ink);
  }
  ring(g, R - 0.62, 0.05, d.ink);
  ticks(g, 60, R - 0.62, R - 0.14, 0.05, d.ink);
  ticks(g, 12, R - 0.95, R - 0.14, 0.1, d.ink);
  const nums: [string, number][] = [
    ['60', 90],
    ['15', 0],
    ['30', -90],
    ['45', 180],
  ];
  for (const [t, a] of nums) {
    const rad = (a * Math.PI) / 180;
    label(g, t, Math.cos(rad) * (R - 1.75), Math.sin(rad) * (R - 1.75), 0.92, `500 SIZE ${SANS}`, t === '60' ? d.accent : d.ink);
  }
  g.restore();
}

function sectorDial(p: Pen, d: DialSpec, o: DialOpts) {
  const { g } = p;
  g.fillStyle = d.base;
  g.fillRect(-DIAL_R, -DIAL_R, DIAL_R * 2, DIAL_R * 2);
  grain(p, 0.05, 3);
  // brushed chapter ring
  g.fillStyle = d.ring;
  g.beginPath();
  g.arc(0, 0, 14.7, 0, Math.PI * 2);
  g.arc(0, 0, 11.35, 0, Math.PI * 2, true);
  g.fill();
  for (let r = 11.4; r < 14.68; r += 0.045) ring(g, r, 0.02, `rgba(${Math.random() > 0.5 ? '255,255,255' : '70,60,48'},0.13)`);
  // sector construction
  ring(g, 11.35, 0.09, d.ink);
  ring(g, 14.7, 0.09, d.ink);
  ring(g, 4.7, 0.055, d.ink);
  ticks(g, 12, 4.7, 11.35, 0.055, d.ink, (i) => i === 0 || i === 6);
  ticks(g, 4, 0.9, 4.7, 0.055, d.ink, (i) => i === 2);
  // railway minute track
  ring(g, 15.1, 0.06, d.ink);
  ring(g, 15.86, 0.06, d.ink);
  ticks(g, 60, 15.1, 15.86, 0.06, d.ink);
  ticks(g, 12, 14.92, 15.86, 0.2, d.ink);
  // hours: Roman at the even hours, batons between
  for (let h = 0; h < 12; h++) {
    if (h === 6) continue;
    const a = Math.PI / 2 - (h / 12) * Math.PI * 2;
    const x = Math.cos(a) * 13.02;
    const y = Math.sin(a) * 13.02;
    if (h % 2 === 0) {
      const flip = h > 3 && h < 9;
      label(g, ROMAN[h], x, y, h === 0 ? 2.5 : 2.2, `600 SIZE ${SERIF}`, d.ink, 0.02, a - Math.PI / 2 + (flip ? Math.PI : 0));
    } else if (!o.applied) {
      g.fillStyle = d.ink;
      g.save();
      g.rotate(a);
      g.fillRect(11.95, -0.2, 2.15, 0.4);
      g.restore();
    }
  }
  // signature, on a cleared ground
  g.fillStyle = d.base;
  g.fillRect(-5.6, 5.15, 11.2, 3.5);
  label(g, 'VALDARNO', 0, 7.5, 1.42, `600 SIZE ${SERIF}`, d.ink, 0.2);
  label(g, 'FIRENZE', 0, 5.95, 0.62, `500 SIZE ${SANS}`, d.ink, 0.42);
  subSeconds(p, d, o.sunk);
  label(g, 'CARICA MANUALE', -4.0, -14.05, 0.46, `500 SIZE ${SANS}`, d.ink, 0.3, (16 * Math.PI) / 180);
  label(g, 'FATTO A FIRENZE', 4.0, -14.05, 0.46, `500 SIZE ${SANS}`, d.ink, 0.3, (-16 * Math.PI) / 180);
}

function classicDial(p: Pen, d: DialSpec) {
  const { g } = p;
  g.fillStyle = d.base;
  g.fillRect(-DIAL_R, -DIAL_R, DIAL_R * 2, DIAL_R * 2);
  grain(p, 0.035, 9);
  // pearl minute track
  g.fillStyle = d.ink;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    g.beginPath();
    g.arc(Math.cos(a) * 15.3, Math.sin(a) * 15.3, i % 5 === 0 ? 0.2 : 0.1, 0, Math.PI * 2);
    g.fill();
  }
  label(g, 'XII', 0, 12.3, 3.1, `500 SIZE ${SERIF}`, d.ink, 0.04);
  label(g, 'VALDARNO', 0, 6.6, 1.36, `600 SIZE ${SERIF}`, d.ink, 0.2);
  label(g, 'FIRENZE', 0, 5.1, 0.6, `500 SIZE ${SANS}`, d.ink, 0.42);
  label(g, d.model, 0, -6.9, 0.66, `500 SIZE ${SANS}`, d.accent, 0.4);
  label(g, 'Carica manuale', 0, -8.2, 1.0, `italic 500 SIZE ${SERIF}`, d.ink);
}

function diverDial(p: Pen, d: DialSpec, o: DialOpts) {
  const { g } = p;
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, DIAL_R);
  grad.addColorStop(0, d.ring);
  grad.addColorStop(1, d.base);
  g.fillStyle = grad;
  g.fillRect(-DIAL_R, -DIAL_R, DIAL_R * 2, DIAL_R * 2);
  // sunray
  const applied = !!o.applied;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    g.strokeStyle = `rgba(255,255,255,${0.012 + (i % 7) * 0.004})`;
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * DIAL_R, Math.sin(a) * DIAL_R);
    g.stroke();
  }
  ticks(g, 60, 14.9, 15.9, 0.1, d.ink);
  const lume = d.lume!;
  const plot = (draw: () => void) => {
    g.fillStyle = '#c9ccd0';
    g.save();
    g.scale(1.14, 1.14);
    draw();
    g.restore();
    g.fillStyle = lume;
    draw();
  };
  for (let h = 0; h < 12 && !applied; h++) {
    const a = Math.PI / 2 - (h / 12) * Math.PI * 2;
    g.save();
    g.rotate(a);
    g.translate(12.4, 0);
    if (h === 0) {
      plot(() => {
        g.beginPath();
        g.moveTo(-1.5, 0);
        g.lineTo(1.3, 1.45);
        g.lineTo(1.3, -1.45);
        g.closePath();
        g.fill();
      });
    } else if (h % 3 === 0) {
      plot(() => g.fillRect(-1.5, -0.62, 3.0, 1.24));
    } else {
      plot(() => {
        g.beginPath();
        g.arc(0, 0, 0.98, 0, Math.PI * 2);
        g.fill();
      });
    }
    g.restore();
  }
  label(g, 'VALDARNO', 0, 6.4, 1.36, `600 SIZE ${SERIF}`, d.ink, 0.2);
  label(g, 'FIRENZE', 0, 4.9, 0.6, `500 SIZE ${SANS}`, d.ink, 0.42);
  label(g, d.model, 0, -5.4, 0.9, `500 SIZE ${SANS}`, d.accent, 0.36);
  label(g, '300 m · 30 bar', 0, -6.9, 0.66, `400 SIZE ${SANS}`, d.ink, 0.2);
  label(g, 'Automatico', 0, -8.2, 1.0, `italic 500 SIZE ${SERIF}`, d.ink);
}

function gmtDial(p: Pen, d: DialSpec) {
  const { g } = p;
  g.fillStyle = d.base;
  g.fillRect(-DIAL_R, -DIAL_R, DIAL_R * 2, DIAL_R * 2);
  grain(p, 0.05, 17);
  ring(g, 14.75, 0.06, d.ink);
  ticks(g, 60, 14.75, 15.5, 0.08, d.ink);
  ticks(g, 12, 14.75, 15.9, 0.22, d.ink);
  // a fine 24-hour scale inside the hour markers
  ring(g, 8.9, 0.045, 'rgba(232,220,192,0.5)');
  for (let h = 0; h < 24; h += 2) {
    const a = Math.PI / 2 - (h / 24) * Math.PI * 2;
    label(g, String(h === 0 ? 24 : h), Math.cos(a) * 7.95, Math.sin(a) * 7.95, 0.86, `500 SIZE ${SANS}`, h === 0 ? d.accent : d.ink);
  }
  ticks(g, 24, 8.9, 9.35, 0.06, d.ink);
  label(g, 'VALDARNO', 0, 5.2, 1.3, `600 SIZE ${SERIF}`, d.ink, 0.2);
  label(g, 'FIRENZE', 0, 3.8, 0.58, `500 SIZE ${SANS}`, d.ink, 0.42);
  label(g, d.model, 0, -4.4, 0.72, `500 SIZE ${SANS}`, d.accent, 0.34);
}

export function dialTexture(d: DialSpec, size = 2048, o: DialOpts = {}): THREE.CanvasTexture {
  const [c, p] = pen(size);
  if (d.style === 'sector') sectorDial(p, d, o);
  else if (d.style === 'classic') classicDial(p, d);
  else if (d.style === 'diver') diverDial(p, d, o);
  else gmtDial(p, d);
  return asTexture(c, true, false);
}

/**
 * The surface of a sector dial, as data: red is height, green roughness, blue metalness.
 * The centre is frosted and dry; the chapter ring is turned on a lathe and takes the light like
 * metal; the seconds dial is cut with fine concentric grooves.
 */
export function dialReliefTexture(d: DialSpec, size = 1024): THREE.CanvasTexture | null {
  if (d.style !== 'sector') return null;
  const [c, p] = pen(size);
  const { g, S } = p;
  const r = rng(41);
  const px = (h: number, rough: number, metal: number, a = 1) => `rgba(${Math.round(h)},${Math.round(rough * 255)},${Math.round(metal * 255)},${a})`;
  g.fillStyle = px(128, 0.6, 0.1);
  g.fillRect(-DIAL_R, -DIAL_R, DIAL_R * 2, DIAL_R * 2);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < S * 60; i++) {
    g.fillStyle = px(128 + (r() - 0.5) * 120, 0.52 + r() * 0.2, 0.1, 0.55);
    g.fillRect(r() * S, r() * S, 1.4, 1.4);
  }
  g.restore();
  // chapter ring: circular graining
  g.fillStyle = px(128, 0.4, 0.62);
  g.beginPath();
  g.arc(0, 0, 14.7, 0, Math.PI * 2);
  g.arc(0, 0, 11.35, 0, Math.PI * 2, true);
  g.fill();
  for (let rr = 11.38; rr < 14.68; rr += 0.034) ring(g, rr, 0.03, px(128 + (r() - 0.5) * 150, 0.3 + r() * 0.2, 0.62));
  // a hairline step where the ring meets the centre and the minute track
  ring(g, 11.35, 0.07, px(40, 0.5, 0.3));
  ring(g, 14.7, 0.07, px(40, 0.5, 0.3));
  // seconds dial: azurage
  g.save();
  g.translate(SUB[0], SUB[1]);
  g.fillStyle = px(150, 0.34, 0.55);
  g.beginPath();
  g.arc(0, 0, 4.45, 0, Math.PI * 2);
  g.fill();
  for (let rr = 0.12; rr < 4.4; rr += 0.15) ring(g, rr, 0.07, px(56, 0.3, 0.55));
  g.restore();
  return asTexture(c, false, false);
}

/** Bezel inserts are painted flat and mapped onto a ring. `R` is the outer radius of the ring in mm. */
export function bezelTexture(kind: 'dive' | 'gmt', R: number, size = 1024): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  const k = size / (R * 2);
  g.translate(size / 2, size / 2);
  g.scale(k, -k);
  const mid = R - 1.45;
  if (kind === 'dive') {
    g.fillStyle = '#16275f';
    g.fillRect(-R, -R, R * 2, R * 2);
    const ink = '#e6dfcc';
    ticks(g, 60, mid + 0.45, mid + 1.05, 0.14, ink, (i) => i > 15 || i === 0);
    ticks(g, 12, mid - 0.55, mid + 1.05, 0.3, ink, (i) => i === 0 || i % 2 === 0);
    for (let m = 10; m < 60; m += 10) {
      const a = Math.PI / 2 - (m / 60) * Math.PI * 2;
      label(g, String(m), Math.cos(a) * mid, Math.sin(a) * mid, 1.9, `500 SIZE ${SANS}`, ink, 0, a - Math.PI / 2);
    }
    g.fillStyle = '#c75a3d';
    g.beginPath();
    g.moveTo(0, mid - 0.95);
    g.lineTo(1.25, mid + 1.0);
    g.lineTo(-1.25, mid + 1.0);
    g.closePath();
    g.fill();
  } else {
    g.fillStyle = '#b9bbbe';
    g.fillRect(-R, -R, R * 2, R * 2);
    for (let r = R - 3; r < R; r += 0.05) ring(g, r, 0.025, `rgba(${Math.random() > 0.5 ? '255,255,255' : '60,60,60'},0.16)`);
    const ink = '#22201e';
    for (let h = 0; h < 24; h++) {
      const a = Math.PI / 2 - (h / 24) * Math.PI * 2;
      if (h % 2 === 0) {
        label(g, String(h === 0 ? 24 : h), Math.cos(a) * mid, Math.sin(a) * mid, 1.65, `500 SIZE ${SANS}`, h === 0 ? '#9a3a26' : ink, 0, a - Math.PI / 2);
      } else {
        g.fillStyle = ink;
        g.beginPath();
        g.arc(Math.cos(a) * mid, Math.sin(a) * mid, 0.24, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  return asTexture(c, true, false);
}

/** Engraving around the caseback, as a roughness-and-tone map wrapped once around the ring. */
export function casebackTexture(text: string): THREE.CanvasTexture {
  const [c, g] = canvas(2048, 64);
  g.fillStyle = '#d2d2d2';
  g.fillRect(0, 0, 2048, 64);
  g.fillStyle = '#4a4a4a';
  g.font = `500 30px ${SANS}`;
  g.textBaseline = 'middle';
  const chars = [...text];
  const adv = 2048 / chars.length;
  g.textAlign = 'center';
  chars.forEach((ch, i) => g.fillText(ch, (i + 0.5) * adv, 34));
  const t = asTexture(c, true);
  return t;
}


/** Lettering set round an arc, tops towards the centre: read from below, left to right. */
function arcLabel(g: CanvasRenderingContext2D, text: string, r: number, centre: number, size: number, font: string, color: string, tracking = 0.12) {
  const U = 100;
  g.save();
  g.font = font.replace('SIZE', `${size * U}px`);
  const widths = [...text].map((ch) => g.measureText(ch).width / U + tracking * size);
  g.restore();
  const total = widths.reduce((a, b) => a + b, 0);
  let acc = 0;
  [...text].forEach((ch, i) => {
    const th = centre + (acc + widths[i] / 2 - total / 2) / r;
    label(g, ch, Math.cos(th) * r, Math.sin(th) * r, size, font, color, 0, th + Math.PI / 2);
    acc += widths[i];
  });
}

/**
 * The engraving on the train bridge, drawn as it is read through the caseback (so east and west are
 * exchanged). Transparent but for the letters, which are filled with midnight lacquer.
 */
export function engravingTexture(size = 1024, jewels = 19): THREE.CanvasTexture {
  const [c, p] = pen(size);
  const { g } = p;
  const ink = '#141d3d';
  const at = (250 * Math.PI) / 180;
  arcLabel(g, 'VALDARNO', 12.55, at - 0.2, 1.22, `600 SIZE ${SERIF}`, ink, 0.2);
  arcLabel(g, 'FIRENZE', 12.62, at + 0.37, 0.7, `500 SIZE ${SANS}`, ink, 0.4);
  arcLabel(g, `CAL. V.31  ·  ${jewels} RUBINI  ·  N° 001`, 10.75, at + 0.05, 0.6, `500 SIZE ${SANS}`, ink, 0.3);
  const t = asTexture(c, true, false);
  t.premultiplyAlpha = false;
  return t;
}

/* ---------------- contact shading ---------------- */

type Pt = [number, number];

/** Paints soft occlusion in millimetres: where one part stands over or against another, less of the room reaches it. */
export interface AOPainter {
  /** a soft shadow under a closed outline */
  poly(pts: Pt[], blur: number, k: number): void;
  disc(c: Pt, r: number, blur: number, k: number): void;
  /** darkening that grows from radius r0 to r1 about c, held inside the circle of radius max(r0, r1) */
  ring(c: Pt, r0: number, r1: number, k: number): void;
}

/**
 * An ambient-occlusion map for a flat part, read through planar UVs: u = x / span + 0.5, v = y / span + 0.5.
 * It only dims the light from the surroundings, so the key light and its shadows are untouched.
 */
export function aoTexture(size: number, span: number, paint: (p: AOPainter) => void): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  const k = size / span;
  const X = (x: number) => (x / span + 0.5) * size;
  const Y = (y: number) => (0.5 - y / span) * size;
  // a blurred shape is drawn as the shadow of a copy pushed off the canvas
  const soft = (blur: number, alpha: number, path: () => void) => {
    g.save();
    g.shadowColor = `rgba(0,0,0,${alpha})`;
    g.shadowBlur = blur * k;
    g.shadowOffsetX = size * 3;
    g.translate(-size * 3, 0);
    g.fillStyle = '#000';
    g.beginPath();
    path();
    g.fill();
    g.restore();
  };
  paint({
    poly(pts, blur, a) {
      soft(blur, a, () => pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))));
    },
    disc([x, y], r, blur, a) {
      soft(blur, a, () => g.arc(X(x), Y(y), r * k, 0, Math.PI * 2));
    },
    ring([x, y], r0, r1, a) {
      const lo = Math.min(r0, r1);
      const hi = Math.max(r0, r1);
      const grad = g.createRadialGradient(X(x), Y(y), lo * k, X(x), Y(y), hi * k);
      // eased, so the shading gathers into the corner instead of a straight ramp
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const e = r1 > r0 ? t * t * t : (1 - t) ** 3;
        grad.addColorStop(t, `rgba(0,0,0,${(a * e).toFixed(4)})`);
      }
      g.fillStyle = grad;
      g.beginPath();
      g.arc(X(x), Y(y), hi * k, 0, Math.PI * 2);
      g.fill();
    },
  });
  const t = asTexture(c, false, false);
  t.anisotropy = 4;
  return t;
}
