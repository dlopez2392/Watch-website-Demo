// Social card: the hero itself, photographed at 1200 x 630. BASE=http://localhost:4173
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const BASE = process.env.BASE ?? 'http://localhost:4173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/?tier=low`, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.hero')?.dataset.ready === 'true', null, { timeout: 120000 });
await page.waitForTimeout(9000);
await page.addStyleTag({ content: '.nav,.hero-scroll,.hero-hint,.parts-index,.annotation{display:none!important}' });
const png = await page.screenshot({ timeout: 120000 });
await browser.close();
await sharp(png).resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile('public/img/og.jpg');
console.log('og done');
