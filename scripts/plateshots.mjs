// Usage: node scripts/plateshots.mjs <base> <outDir> [id ...]   (base e.g. http://localhost:5173)
// Photographs each plate alone, fully drawn, from the /?plates sheet.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [base, out, ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const all = ids.length ? ids : ['train', 'escapement', 'balance', 'winding', 'section', 'finish', 'codice', 'lungarno', 'tirreno', 'doppiofuso'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
for (const id of all) {
  await page.goto(`${base}/?plates=${id}`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.locator(`[data-plate-id="${id}"]`).screenshot({ path: `${out}/${id}.png` });
}
console.log(logs.slice(0, 10).join('\n') || 'no console errors');
await browser.close();
