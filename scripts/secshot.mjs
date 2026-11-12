// Usage: node scripts/secshot.mjs <url> <selector> <out.png> [width] [height] [dsf] [fullElement]
// Screenshots one section of the page with motion reduced, so the hero does not have to render.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, selector, out, w = '1440', h = '900', dsf = '1', full = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const el = page.locator(selector).first();
await el.scrollIntoViewIfNeeded();
await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager')));
await page.waitForTimeout(2500);
if (full === '1') await el.screenshot({ path: out });
else {
  await el.evaluate((n) => window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - 40));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out });
}
console.log(logs.slice(0, 12).join('\n') || 'no console errors');
await browser.close();
