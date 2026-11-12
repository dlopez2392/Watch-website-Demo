// Usage: node scripts/pageshots.mjs <url> <outPrefix> <width> <height> <dsf> <firstWaitMs> <scrollY,scrollY,...|selector,...>
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const [url, prefix, w = '1440', h = '900', dsf = '1', wait = '9000', stops = '0', extra = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = +w < 600;
const ctx = await browser.newContext({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: +dsf,
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: extra.includes('reduced') ? 'reduce' : 'no-preference',
});
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 400)); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
let i = 0;
for (const stop of stops.split(',')) {
  if (/^[\d.]+$/.test(stop)) {
    await page.evaluate((y) => window.scrollTo(0, y), +stop);
  } else if (stop.startsWith('vh')) {
    await page.evaluate((k) => window.scrollTo(0, window.innerHeight * k), +stop.slice(2));
  } else {
    await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 0); }, stop);
  }
  await page.waitForTimeout(i === 0 ? 300 : 3200);
  await page.screenshot({ path: `${prefix}-${i}.png`, timeout: 120000 }).catch((e) => logs.push('shot failed ' + e.message.split('\n')[0]));
  i++;
}
console.log([...new Set(logs)].slice(0, 25).join('\n') || 'no console errors');
await browser.close();
