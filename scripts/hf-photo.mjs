// Turns a studio render into a photograph through the Higgsfield API: the render fixes the design,
// the lettering and the camera; the image model supplies the light and the materials.
// Usage: node scripts/hf-photo.mjs [codice lungarno tirreno doppiofuso calibro] [--force]
// Reads scripts/.tmp/refs/<name>.png (npm run assets:stills) and writes scripts/.tmp/hf/photo-<name>.png.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.higgsfield.ai';
const OUT = 'scripts/.tmp/hf';
mkdirSync(OUT, { recursive: true });
const MODEL = '/marketing-studio/image/sunburst';

const KEEP =
  'Keep the design, proportions, framing and camera angle exactly as in the reference image. Keep every numeral, index, line and letter on the dial exactly where it is and exactly as written; do not add, remove, restyle or re-space any text or marking, and do not invent any logo.';
const LIGHT =
  'Soft north window light from the upper left, a deep midnight-blue seamless backdrop, a gentle shadow, shallow depth of field, shot on a 100 mm macro lens, fine film grain, luxury watchmaking catalogue photography, muted and quiet.';

export const PHOTOS = {
  codice: `Turn this 3D render into a photorealistic studio product photograph of the same wristwatch. ${KEEP} The dial reads VALDARNO and FIRENZE, with Roman numerals XII, II, IIII, VIII, X, a small-seconds dial marked 60, 15, 30, 45, and the words CARICA MANUALE and FATTO A FIRENZE at the foot. Make the materials real: a polished and brushed stainless-steel case with crisp reflections of a tall window, a domed sapphire crystal with a faint reflection, slender heat-blued steel leaf hands and blued applied batons, a grained silver-ivory two-tone sector dial with a sunk seconds dial cut with fine concentric rings, a cognac vegetable-tanned calf strap with visible pores and cream saddle stitching. ${LIGHT}`,
  lungarno: `Turn this 3D render into a photorealistic studio product photograph of the same wristwatch. ${KEEP} The dial reads XII, VALDARNO, FIRENZE, LUNGARNO and Carica manuale. Make the materials real: a slim polished yellow-gold case with soft warm reflections of a tall window, a domed sapphire crystal with a faint reflection, an ivory lacquer dial with a pearl minute track, faceted applied gold baton indexes, two gold leaf hands, a dark chestnut calf strap with fine grain and tone-on-tone stitching. ${LIGHT}`,
  tirreno: `Turn this 3D render into a photorealistic studio product photograph of the same dive wristwatch. ${KEEP} The dial reads VALDARNO, FIRENZE, TIRRENO, 300 m · 30 bar and Automatico; the bezel reads 10, 20, 30, 40, 50 with a red triangle at twelve. Make the materials real: a brushed stainless-steel case with polished chamfers, a coin-edge bezel with a glossy midnight-blue ceramic insert, a flat sapphire crystal, a deep blue sunray lacquer dial, applied cream luminous markers in polished steel surrounds, sword hands, a midnight-blue sailcloth strap. ${LIGHT}`,
  doppiofuso: `Turn this 3D render into a photorealistic studio product photograph of the same travel wristwatch. ${KEEP} The dial reads VALDARNO, FIRENZE and DOPPIO FUSO with a small twenty-four-hour scale; the steel bezel is engraved with a twenty-four-hour scale. Make the materials real: a brushed and polished stainless-steel case, a circular-brushed steel bezel with engraved numerals filled in black, a domed sapphire crystal, a matte brown-black grained dial, faceted applied steel batons, polished steel hands and a fourth hand with a red arrow tip, a dark brown calf strap with fine grain and cream stitching. ${LIGHT}`,
  calibro: `Turn this 3D render into a photorealistic extreme macro photograph of the same hand-wound watch movement seen through the back of its steel case. ${KEEP} The engraving on the lower bridge reads CAL. V.31 · 19 RUBINI · N° 001 and VALDARNO FIRENZE, exactly as in the reference. Make the materials real: frosted gilt bridges with broad Geneva stripes and mirror-polished bevels, a pearled gilt mainplate, raspberry-red ruby jewels set in polished gold chatons, cornflower heat-blued screws with crisp slots sitting in polished countersinks, steel winding wheels with a sunray finish, a gilt balance wheel with a blued hairspring under its bridge. ${LIGHT}`,
};

function curl(args) {
  return execFileSync('curl', ['-sS', '--max-time', '180', ...(process.env.HF_AUTH ? ['-H', `Authorization: ${process.env.HF_AUTH}`] : []), ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REFS = 'scripts/.tmp/refs';
const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
for (const n of names) if (!PHOTOS[n]) throw new Error(`unknown photograph "${n}": one of ${Object.keys(PHOTOS).join(', ')}`);

async function photograph(name) {
  const render = `${REFS}/${name}.png`;
  const out = `${OUT}/photo-${name}.png`;
  const statePath = `${OUT}/photo-${name}.json`;
  if (existsSync(out) && !force) return console.log('kept', out);
  if (!existsSync(render)) throw new Error(`${render} is missing: run "npm run assets:stills" first`);
  const state = existsSync(statePath) && !force ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  if (!state.request_id) {
    const up = JSON.parse(curl(['-X', 'POST', `${API}/files/generate-upload-url`, '-H', 'Content-Type: application/json', '-d', '{"content_type":"image/png"}']));
    const headers = Object.entries(up.upload_headers ?? { 'Content-Type': 'image/png' }).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
    execFileSync('curl', ['-sS', '--max-time', '180', '-X', 'PUT', up.upload_url, ...headers, '--data-binary', `@${render}`]);
    const body = { prompt: PHOTOS[name], image_urls: [up.public_url], aspect_ratio: name === 'calibro' ? '1:1' : '3:4', resolution: '2k', quality: 'high', enhance_prompt: false };
    const res = JSON.parse(curl(['-X', 'POST', `${API}${MODEL}`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]));
    if (!res.request_id) throw new Error(JSON.stringify(res).slice(0, 600));
    state.request_id = res.request_id;
    state.reference = up.public_url;
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log('queued', name, res.request_id);
  }
  for (let i = 0; i < 150; i++) {
    const st = JSON.parse(curl([`${API}/requests/${state.request_id}/status`]));
    if (st.status === 'completed') {
      const url = st.images?.[0]?.url;
      execFileSync('curl', ['-sS', '--max-time', '300', '-o', out, url]);
      state.url = url;
      writeFileSync(statePath, JSON.stringify(state, null, 2));
      return console.log('done', out);
    }
    if (['failed', 'nsfw', 'canceled'].includes(st.status)) throw new Error(`${name}: ${JSON.stringify(st).slice(0, 400)}`);
    await sleep(6000);
  }
  throw new Error(`${name}: timed out`);
}

await Promise.all((names.length ? names : Object.keys(PHOTOS)).map(photograph));
