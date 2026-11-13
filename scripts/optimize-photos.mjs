// The watch photographs: scripts/.tmp/hf/photo-<name>.png (made by hf-photo.mjs from the studio renders)
// become the catalogue plates, a detail of each cut from the same frame, and the portrait of the calibre.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
const sharp = createRequire(import.meta.url)('sharp');

const SRC = 'scripts/.tmp/hf';
mkdirSync('public/img/hf', { recursive: true });

// where to look for the detail: centre of the crop and its width, as fractions of the frame
const DETAIL = {
  codice: [0.46, 0.49, 0.4],
  lungarno: [0.47, 0.4, 0.42],
  tirreno: [0.55, 0.3, 0.44],
  doppiofuso: [0.36, 0.4, 0.44],
};

for (const [id, [cx, cy, w]] of Object.entries(DETAIL)) {
  const file = `${SRC}/photo-${id}.png`;
  if (!existsSync(file)) continue;
  const m = await sharp(file).metadata();
  await sharp(file).resize(1500, 2000, { fit: 'cover' }).webp({ quality: 82, effort: 6 }).toFile(`public/img/${id}.webp`);
  await sharp(file).resize(900, 1200, { fit: 'cover' }).webp({ quality: 78, effort: 6 }).toFile(`public/img/${id}-900.webp`);
  await sharp(file).resize(300, 400, { fit: 'cover' }).webp({ quality: 74, effort: 6 }).toFile(`public/img/${id}-300.webp`);
  await sharp(file).resize(600, 800, { fit: 'cover' }).webp({ quality: 76, effort: 6 }).toFile(`public/img/${id}-600.webp`);
  const cw = Math.round(m.width * w);
  const ch = Math.round((cw * 4) / 3);
  const left = Math.max(0, Math.min(m.width - cw, Math.round(m.width * cx - cw / 2)));
  const top = Math.max(0, Math.min(m.height - ch, Math.round(m.height * cy - ch / 2)));
  const crop = await sharp(file).extract({ left, top, width: cw, height: ch }).toBuffer();
  await sharp(crop).resize(900, 1200).sharpen({ sigma: 0.6 }).webp({ quality: 80, effort: 6 }).toFile(`public/img/hf/detail-${id}.webp`);
  await sharp(crop).resize(600, 800).webp({ quality: 78, effort: 6 }).toFile(`public/img/hf/detail-${id}-900.webp`);
  console.log('plate', id, m.width, m.height);
}

const calibro = `${SRC}/photo-calibro.png`;
if (existsSync(calibro)) {
  const m = await sharp(calibro).metadata();
  await sharp(calibro).resize(1800, 1800).webp({ quality: 82, effort: 6 }).toFile('public/img/hf/calibro.webp');
  await sharp(calibro).resize(900, 900).webp({ quality: 78, effort: 6 }).toFile('public/img/hf/calibro-900.webp');
  // the frame the film of the calibre starts from: three by two, the movement in the middle
  const h = Math.round((m.width * 2) / 3);
  await sharp(calibro).extract({ left: 0, top: Math.round((m.height - h) / 2 - m.height * 0.01), width: m.width, height: h }).png().toFile(`${SRC}/calibro-film-src.png`);
  console.log('calibro', m.width, m.height);
}

// the social card: the Codice, as photographed
const codice = `${SRC}/photo-codice.png`;
if (existsSync(codice)) {
  const m = await sharp(codice).metadata();
  const w = m.width;
  const h = Math.round((w * 630) / 1200);
  await sharp(codice).extract({ left: 0, top: Math.round(m.height * 0.2), width: w, height: h }).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile('public/img/og.jpg');
  console.log('og');
}
