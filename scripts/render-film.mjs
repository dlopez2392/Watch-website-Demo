// Films the Calibro V.31 at the bench: a ten-second macro loop, stepped frame by frame from the studio
// so it closes exactly, then encoded for the web. Needs a dev or preview server: BASE=http://localhost:5173
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');

const BASE = process.env.BASE ?? 'http://localhost:5173';
const FPS = 24;
const SECONDS = 10;
const W = 1440;
const H = 810;
const tmp = 'scripts/.tmp/film';
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync('public/video', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${BASE}/?studio=film&bg=0b1122`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 240000 });
await page.waitForTimeout(6000);
const frames = FPS * SECONDS;
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__studio.setTime(t), i / FPS);
  await page.screenshot({ path: `${tmp}/f${String(i).padStart(4, '0')}.png`, timeout: 120000 });
  if (i % 24 === 0) console.log(`frame ${i}/${frames}`, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close();

const vf = 'vignette=PI/4.6,format=yuv420p';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${tmp}/f%04d.png`, '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-movflags', '+faststart', '-an', 'public/video/bottega.mp4']);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${tmp}/f%04d.png`, '-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-an', 'public/video/bottega.webm']);
await sharp(`${tmp}/f0000.png`).webp({ quality: 80 }).toFile('public/video/bottega-poster.webp');
console.log('film done');
