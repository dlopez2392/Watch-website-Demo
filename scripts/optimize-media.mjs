// Turns the Higgsfield originals in scripts/.tmp/hf into web assets under public/.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const sharp = createRequire(import.meta.url)('sharp');

const SRC = 'scripts/.tmp/hf';
mkdirSync('public/img/hf', { recursive: true });
mkdirSync('public/video', { recursive: true });

// some frames come back with a mat around them; cut it away
const TRIM = new Set(['bottega-bluing', 'bottega-watchmaker', 'bottega-anglage', 'notebook-page', 'notebook-watch']);

for (const file of readdirSync(SRC)) {
  if (!file.endsWith('.png') || file === 'test.png' || file.endsWith('-poster.png')) continue;
  // the watches themselves are photographed from the site's own renders: see optimize-photos.mjs
  if (/^(still|detail|photo)-/.test(file) || file === 'bottega-movement.png' || file === 'calibro-film-src.png') continue;
  const name = file.replace('.png', '');
  let img = sharp(`${SRC}/${file}`);
  if (TRIM.has(name)) {
    const t = sharp(await img.trim({ threshold: 28 }).toBuffer());
    const tm = await t.metadata();
    // and a little more, to be clear of the mat's soft edge
    const dx = Math.round(tm.width * 0.022);
    const dy = Math.round(tm.height * 0.022);
    img = sharp(await t.extract({ left: dx, top: dy, width: tm.width - 2 * dx, height: tm.height - 2 * dy }).toBuffer());
  }
  if (name === 'parchment') {
    // one clean leaf of the sheet, away from the fold
    const m = await img.metadata();
    img = sharp(await img.extract({ left: Math.round(m.width * 0.55), top: Math.round(m.height * 0.08), width: Math.round(m.width * 0.4), height: Math.round(m.height * 0.82) }).toBuffer());
    await img.resize(1800, 1200, { fit: 'cover' }).modulate({ saturation: 0.9 }).webp({ quality: 70, effort: 6 }).toFile('public/img/hf/parchment.webp');
    console.log('parchment');
    continue;
  }
  const meta = await img.metadata();
  const buf = await img.toBuffer();
  await sharp(buf).resize({ width: Math.min(1800, meta.width) }).webp({ quality: 78, effort: 6 }).toFile(`public/img/hf/${name}.webp`);
  await sharp(buf).resize({ width: 900 }).webp({ quality: 74, effort: 6 }).toFile(`public/img/hf/${name}-900.webp`);
  console.log(name, meta.width, meta.height);
}

// films: a forward-and-back loop closes on itself without a cut
for (const file of readdirSync(SRC)) {
  if (!file.endsWith('.mp4')) continue;
  const name = file.replace('.mp4', '');
  const src = `${SRC}/${file}`;
  if (existsSync(`public/video/${name}.mp4`) && !process.argv.includes('--force')) continue;
  // the bluing clip inherits a mat from its source frame
  const crop = name === 'film-bluing' ? 'crop=iw*0.79:ih*0.9:iw*0.175:ih*0.045,' : '';
  const filter = `[0:v]${crop}scale=1600:-2,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,format=yuv420p[v]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-filter_complex', filter, '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', `public/video/${name}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-filter_complex', filter, '-map', '[v]', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', `public/video/${name}.webm`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-vf', `${crop}scale=1600:-2`, `${SRC}/${name}-poster.png`]);
  await sharp(`${SRC}/${name}-poster.png`).webp({ quality: 76 }).toFile(`public/video/${name}-poster.webp`);
  console.log('film', name);
}
