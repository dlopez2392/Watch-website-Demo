// Renders a seamless parchment tile from SVG turbulence, once, so the browser never has to.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const S = 1280;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0 0.16  0.9 0 0 0 -0.34"/>
  </filter>
  <filter id="fibre" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="2" seed="21" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.17  1.3 0 0 0 -0.62"/>
  </filter>
  <filter id="cloud" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.0046" numOctaves="4" seed="3" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.52  0 0 0 0 0.37  0 0 0 0 0.2  1.5 0 0 0 -0.66"/>
  </filter>
  <filter id="light" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.0062" numOctaves="3" seed="44" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.88  1.4 0 0 0 -0.7"/>
  </filter>
  <rect width="100%" height="100%" fill="#ece0c8"/>
  <rect width="100%" height="100%" filter="url(#cloud)" opacity="0.2"/>
  <rect width="100%" height="100%" filter="url(#light)" opacity="0.22"/>
  <rect width="100%" height="100%" filter="url(#fibre)" opacity="0.34"/>
  <rect width="100%" height="100%" filter="url(#grain)" opacity="0.42"/>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: S, height: S } });
await page.setContent(`<body style="margin:0">${svg}</body>`);
const png = await page.screenshot({ clip: { x: 0, y: 0, width: S, height: S } });
await browser.close();
mkdirSync('public/img', { recursive: true });
await sharp(png).webp({ quality: 80, effort: 6 }).toFile('public/img/parchment.webp');
const meta = await sharp('public/img/parchment.webp').metadata();
console.log('parchment', meta.width, meta.height, meta.size);
