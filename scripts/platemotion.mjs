// Usage: node scripts/platemotion.mjs <base> <outDir> [id ...]
// Sets each plate running on the /?plates sheet and photographs it at several moments.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [base, out, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const all = ids.length ? ids : ['train', 'escapement', 'balance', 'winding', 'codice', 'tirreno'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
for (const id of all) {
  await page.goto(`${base}/?plates=${id}&move`, { waitUntil: 'load' });
  const seen = [];
  for (const [i, wait] of [[0, 2600], [1, 700], [2, 900]]) {
    await page.waitForTimeout(wait);
    await page.locator(`[data-plate-id="${id}"]`).screenshot({ path: `${out}/${id}-${i}.png` });
    seen.push(await page.evaluate(() => Array.from(document.querySelectorAll('[data-live]')).map((e) => e.getAttribute('transform') ?? e.getAttribute('d')?.length).join('|')));
  }
  console.log(id, seen[0] !== seen[1] && seen[1] !== seen[2] ? 'moving' : 'STILL', '·', seen[2].slice(0, 150));
}
console.log(logs.slice(0, 10).join('\n') || 'no console errors');
await browser.close();
