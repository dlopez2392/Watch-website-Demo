// Photographs the collection from the site's own studio. Needs a dev or preview server: BASE=http://localhost:5173
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:5173';
const only = process.argv.slice(2);
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
mkdirSync('public/img', { recursive: true });

async function capture(url, w, h) {
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 240000 });
  await page.waitForTimeout(9000);
  const png = await page.screenshot({ omitBackground: true, timeout: 240000 });
  await browser.close();
  return png;
}

const jobs = [];
for (const id of ['codice', 'lungarno', 'tirreno', 'doppiofuso']) {
  if (only.length && !only.includes(id)) continue;
  jobs.push(async () => {
    const png = await capture(`${BASE}/?studio=still&watch=${id}`, 2250, 2550);
    await sharp(png).resize(1500, 1700).webp({ quality: 86, alphaQuality: 92, effort: 6 }).toFile(`public/img/${id}.webp`);
    await sharp(png).resize(900, 1020).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(`public/img/${id}-900.webp`);
    console.log('still', id);
  });
}
if (!only.length || only.includes('fallback')) {
  jobs.push(async () => {
    // the reduced-motion illustration: half drawing, half object
    const png = await capture(`${BASE}/?studio=hero&intro=1&scroll=0&ink=1&spin=0.6`, 2700, 1800);
    await sharp(png).resize(1800, 1200).webp({ quality: 84, alphaQuality: 92, effort: 6 }).toFile('public/img/hero-fallback.webp');
    console.log('fallback');
  });
}
// two at a time: the software renderer is single-minded
for (let i = 0; i < jobs.length; i += 2) await Promise.all(jobs.slice(i, i + 2).map((j) => j()));
