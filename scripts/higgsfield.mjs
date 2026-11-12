// Generates the site's photography and film through the Higgsfield API (api.higgsfield.ai).
// Usage: node scripts/higgsfield.mjs <images|videos> [name ...]
// Credentials are supplied by the environment's proxy; set HF_AUTH="Key id:secret" to run elsewhere.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const API = 'https://api.higgsfield.ai';
const OUT = 'scripts/.tmp/hf';
mkdirSync(OUT, { recursive: true });

// One look for everything: north light, parchment and sepia, midnight shadows.
const LOOK =
  'Soft north window light from the left, warm parchment and sepia tones with deep midnight-blue shadows, very shallow depth of field, fine film grain, editorial luxury watchmaking photography, muted palette, no text, no lettering, no logos';
const NOTEBOOK =
  'Renaissance engineering notebook, aged parchment, sepia iron-gall ink and red chalk drawings, cross-hatching, compass-and-ruler construction lines, proportion circles, small marginal notes in a slanted mirrored hand';

export const IMAGES = {
  'bottega-room': ['16:9', `Wide interior of a small Florentine watchmaking workshop in an old Oltrarno palazzo: a row of worn wooden watchmaker's benches under one tall north-facing window, brass lamps, loupes, glass dust domes, drawers of tools, terracotta floor, pale plaster walls, nobody in frame. ${LOOK}`],
  'bottega-bluing': ['3:2', `Extreme macro of tiny polished steel watch screws turning cornflower blue on a brass tray held over a small spirit flame, steel tweezers at the edge of frame, a few screws still straw-coloured and purple. ${LOOK}`],
  'bottega-anglage': ['3:2', `Extreme macro of a watchmaker's fingers polishing the bevelled edge of a small striped steel watch bridge with a boxwood stick, the bevel catching a single bright line of light, a loupe blurred in the foreground. ${LOOK}`],
  'bottega-watchmaker': ['3:4', `Over-the-shoulder view of a watchmaker in a linen apron at a wooden bench, a loupe at his eye, hands at work on a small mechanical movement under a brass lamp, tall window behind, face not visible. ${LOOK}`],
  'notebook-spread': ['16:9', `An open ${NOTEBOOK}, lying on a dark walnut desk: both pages filled with drawings of a mechanical watch movement, gear trains, an escapement, a balance wheel and spring. A brass compass and a quill rest on the page. Top-down, soft window light, shallow depth of field at the edges, no modern objects`],
  'notebook-watch': ['3:2', `Top-down flat lay: a sheet from a ${NOTEBOOK}, showing an exploded-view drawing of a wristwatch with its parts separated along one axis. A real polished steel dress wristwatch with an ivory dial, blue steel hands and a cognac leather strap lies on the page beside the drawing. Soft north light, fine film grain, no brand names`],
  'notebook-page': ['3:2', `A single sheet from a ${NOTEBOOK}, flat and evenly lit, top-down: a large plan drawing of a round watch case inside a circle and a square, with a side elevation and dimension lines, generous empty parchment around it, faint foxing at the edges`],
  parchment: ['16:9', 'A blank sheet of aged handmade parchment paper filling the whole frame, perfectly flat, evenly lit from above, subtle laid-paper fibres, faint foxing and soft stains toward the edges, warm ivory-tan colour, no drawings, no writing, no folds, no objects, top-down scan'],
};

// A source is the name of an image above, or `file:` and a path to a local frame (uploaded first).
export const VIDEOS = {
  'film-calibro': ['file:scripts/.tmp/hf/calibro-film-src.png', 'Locked-off extreme macro shot of a watch movement. The gilt balance wheel swings rapidly back and forth beneath its bridge and the blued hairspring breathes in and out; a soft band of window light drifts very slowly across the striped gilt bridges. Everything else stays perfectly still: the screws, the jewels, the engraved lettering and the steel case do not move or change. Calm, precise, no camera movement.'],
  'film-hands': ['bottega-hands', 'Locked-off macro shot. The tweezers lower the golden wheel very slowly toward the movement and hold. Inside the movement the small balance wheel swings back and forth. Dust motes drift through the window light. Slow, calm, no camera shake.'],
  'film-bluing': ['bottega-bluing', 'Locked-off macro shot. The small flame beneath the brass tray flickers gently, a faint heat shimmer rises, the steel screws deepen slowly towards blue. Slow, calm, no camera movement.'],
};

function curl(args) {
  return execFileSync('curl', ['-sS', '--max-time', '120', ...(process.env.HF_AUTH ? ['-H', `Authorization: ${process.env.HF_AUTH}`] : []), ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
}
const statePath = `${OUT}/requests.json`;
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function submit(name, path, body) {
  if (state[name]?.url || state[name]?.request_id) return;
  const res = JSON.parse(curl(['-X', 'POST', `${API}${path}`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]));
  if (!res.request_id) throw new Error(`${name}: ${JSON.stringify(res).slice(0, 400)}`);
  state[name] = { request_id: res.request_id, path };
  save();
  console.log('queued', name, res.request_id);
}

/** Puts a local frame where the API can read it and returns its public address. */
function upload(path) {
  const up = JSON.parse(curl(['-X', 'POST', `${API}/files/generate-upload-url`, '-H', 'Content-Type: application/json', '-d', '{"content_type":"image/png"}']));
  const headers = Object.entries(up.upload_headers ?? { 'Content-Type': 'image/png' }).flatMap(([k, v]) => ['-H', `${k}: ${v}`]);
  execFileSync('curl', ['-sS', '--max-time', '180', '-X', 'PUT', up.upload_url, ...headers, '--data-binary', `@${path}`]);
  return up.public_url;
}

async function collect(names, ext) {
  let pending = names.filter((n) => !existsSync(`${OUT}/${n}.${ext}`));
  while (pending.length) {
    for (const n of pending) {
      const s = state[n];
      if (!s?.request_id) continue;
      const r = JSON.parse(curl([`${API}/requests/${s.request_id}/status`]));
      if (r.status === 'completed') {
        const url = r.images?.[0]?.url ?? r.video?.url ?? r.videos?.[0]?.url;
        if (!url) throw new Error(`${n}: no output in ${JSON.stringify(r).slice(0, 400)}`);
        s.url = url;
        save();
        execFileSync('curl', ['-sS', '--max-time', '300', '-o', `${OUT}/${n}.${ext}`, url]);
        console.log('done', n);
      } else if (['failed', 'nsfw', 'canceled'].includes(r.status)) {
        console.log('FAILED', n, JSON.stringify(r).slice(0, 300));
        s.failed = r.status;
        delete s.request_id;
        save();
      }
    }
    pending = pending.filter((n) => !existsSync(`${OUT}/${n}.${ext}`) && state[n]?.request_id);
    if (pending.length) await sleep(6000);
  }
}

const [mode, ...only] = process.argv.slice(2);
if (mode === 'images') {
  const names = Object.keys(IMAGES).filter((n) => !only.length || only.includes(n));
  for (const n of names) submit(n, '/higgsfield-ai/soul/standard', { prompt: IMAGES[n][1], aspect_ratio: IMAGES[n][0], resolution: '1080p' });
  await collect(names, 'png');
} else if (mode === 'videos') {
  const names = Object.keys(VIDEOS).filter((n) => !only.length || only.includes(n));
  for (const n of names) {
    const from = VIDEOS[n][0];
    const src = from.startsWith('file:') ? upload(from.slice(5)) : state[from]?.url;
    if (!src) throw new Error(`${n}: source image ${from} has no URL yet`);
    submit(n, '/kling-video/v2.5-turbo/pro/image-to-video', { prompt: VIDEOS[n][1], image_url: src, duration: 5, negative_prompt: 'captions, watermark, camera shake, zoom, morphing, changing text, extra fingers' });
  }
  await collect(names, 'mp4');
}
console.log('higgsfield', mode, 'complete');
