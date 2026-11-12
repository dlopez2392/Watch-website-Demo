// Usage: node scripts/fullpage.mjs <url> <out.jpg> [width] [dsf]
// One tall picture of the whole page with motion reduced (the hero is then its still illustration).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out, w = '1440', dsf = '1'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +w, height: 900 }, deviceScaleFactor: +dsf, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.evaluate(async () => {
  document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'));
  for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2500);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('page height', h);
await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 80 });
console.log(logs.slice(0, 10).join('\n') || 'no console errors');
await browser.close();
