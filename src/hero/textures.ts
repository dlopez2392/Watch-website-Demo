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

/** Calf grain. */
export function leatherTexture(): THREE.CanvasTexture {
  const S = 256;
  const [c, g] = canvas(S, S);
  const r = rng(23);
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i++) {
    const v = r() > 0.5 ? 200 : 60;
    g.fillStyle = `rgba(${v},${v},${v},${0.08 + r() * 0.16})`;
    const s = 0.6 + r() * 2.2;
    g.beginPath();
    g.ellipse(r() * S, r() * S, s, s * (0.5 + r() * 0.8), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return asTexture(c, false);
}

/** Strap face: leather colour with a line of stitching down each edge. */
export function strapTexture(color: string, stitch: string): THREE.CanvasTexture {
  const [c, g] = canvas(128, 256);
  const r = rng(31);
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r() * 0.05})`;
    g.fillRect(r() * 128, r() * 256, 1 + r() * 2, 1 + r() * 2);
  }
  if (stitch !== color) {
    g.strokeStyle = stitch;
    g.lineWidth = 2.6;
    g.lineCap = 'round';
    g.setLineDash([15, 10.6]);
    for (const x of [15, 113]) {
      g.beginPath();
      g.moveTo(x, 4);
      g.lineTo(x, 256);
      g.stroke();
    }
  } else {
    // sailcloth weave
    g.strokeStyle = 'rgba(255,255,255,0.07)';
    g.lineWidth = 1;
    for (let y = 0; y < 256; y += 4) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(128, y);
      g.stroke();
    }
    for (let x = 0; x < 128; x += 4) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 256);
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

function subSeconds(p: Pen, d: DialSpec) {
  const { g } = p;
  const R = 4.3;
  g.save();
  g.translate(SUB[0], SUB[1]);
  g.fillStyle = d.ring;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  // azurage: fine concentric rings
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

function sectorDial(p: Pen, d: DialSpec) {
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
    } else {
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
  subSeconds(p, d);
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

function diverDial(p: Pen, d: DialSpec) {
  const { g } = p;
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, DIAL_R);
  grad.addColorStop(0, d.ring);
  grad.addColorStop(1, d.base);
  g.fillStyle = grad;
  g.fillRect(-DIAL_R, -DIAL_R, DIAL_R * 2, DIAL_R * 2);
  // sunray
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
  for (let h = 0; h < 12; h++) {
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

export function dialTexture(d: DialSpec, size = 2048): THREE.CanvasTexture {
  const [c, p] = pen(size);
  if (d.style === 'sector') sectorDial(p, d);
  else if (d.style === 'classic') classicDial(p, d);
  else if (d.style === 'diver') diverDial(p, d);
  else gmtDial(p, d);
  return asTexture(c, true, false);
}

/** Bezel inserts are painted flat and mapped onto a ring. `R` is the outer radius of the ring in mm. */
export function bezelTexture(kind: 'dive' | 'gmt', R: number, size = 1024): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  const k = size / (R * 2);
  g.translate(size / 2, size / 2);
  g.scale(k, -k);
  const mid = R - 1.45;
  if (kind === 'dive') {
    g.fillStyle = '#131c38';
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
