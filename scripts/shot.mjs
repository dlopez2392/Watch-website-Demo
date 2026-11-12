// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [dsf] [waitMs] [transparent]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out, w = '1440', h = '900', dsf = '1', wait = '2500', transparent = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
try {
  await page.goto(url, { waitUntil: 'load' });
  if (url.includes('studio=')) {
    await page.waitForFunction(() => window.__studio && window.__studio.ready, null, { timeout: 120000 });
    console.log('studio ready after', Date.now() - t0, 'ms');
  }
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out, omitBackground: transparent === '1', timeout: 120000 });
} catch (e) {
  console.log('FAILED:', e.message.split('\n')[0]);
}
console.log(logs.slice(0, 20).join('\n') || 'no console errors');
console.log('total', Date.now() - t0, 'ms');
await browser.close();
