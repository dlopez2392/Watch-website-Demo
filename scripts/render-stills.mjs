// Renders, from the site's own studio, the frames the watch photographs are made from, and the
// reduced-motion illustration. Needs a dev or preview server: BASE=http://localhost:5173
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:5173';
const only = process.argv.slice(2);
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
mkdirSync('public/img', { recursive: true });

async function capture(url, w, h, transparent = true) {
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 240000 });
  await page.waitForTimeout(9000);
  const png = await page.screenshot({ omitBackground: transparent, timeout: 240000 });
  await browser.close();
  return png;
}

// The studio frames the photographs are made from: the four watches and the calibre, on midnight.
// They fix the design, the lettering and the camera; scripts/hf-photo.mjs turns each into a photograph.
const REFS = 'scripts/.tmp/refs';
mkdirSync(REFS, { recursive: true });
const STUDIO = `${BASE}/?studio=still&bg=111a33&dark=1&shadow=0`;
const jobs = [];
for (const id of ['codice', 'lungarno', 'tirreno', 'doppiofuso']) {
  if (only.length && !only.includes(id)) continue;
  jobs.push(async () => {
    const png = await capture(`${STUDIO}&watch=${id}`, 1200, 1600, false);
    await sharp(png).png().toFile(`${REFS}/${id}.png`);
    console.log('reference', id);
  });
}
// The close lens: one detail of each watch, framed as its own photograph rather than cut from the catalogue plate.
const MACRO = {
  codice: 'zoom=2.6&pan=0,-4',
  lungarno: 'zoom=2.5&pan=1,3',
  tirreno: 'zoom=2.4&pan=1,11',
  doppiofuso: 'zoom=2.3&pan=-3,7',
};
for (const [id, frame] of Object.entries(MACRO)) {
  if (only.length && !only.includes(`macro-${id}`) && !only.includes('macro')) continue;
  jobs.push(async () => {
    const png = await capture(`${STUDIO}&watch=${id}&view=macro&${frame}`, 1200, 1600, false);
    await sharp(png).png().toFile(`${REFS}/macro-${id}.png`);
    console.log('reference', `macro-${id}`);
  });
}
if (!only.length || only.includes('calibro')) {
  jobs.push(async () => {
    const png = await capture(`${STUDIO}&watch=codice&view=back&hide=caseback,strap,buckle&zoom=1.32`, 1400, 1400, false);
    await sharp(png).png().toFile(`${REFS}/calibro.png`);
    console.log('reference calibro');
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
