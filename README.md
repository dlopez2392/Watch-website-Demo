# Valdarno · Manifattura Orologiera

A concept site for a fictional Florentine watch house. The page is a Renaissance engineering
notebook; the watch drawn in it lifts off the parchment and becomes steel.

Valdarno, its history, its people, its prices and its watches are invented. Nothing here is for sale.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

Node 20 or newer. No environment variables, no network calls at runtime, fonts are self-hosted.

## What is in here

| Path | What it is |
| --- | --- |
| `src/lib/calibre.ts` | The Calibro V.31 as numbers: pivot positions, tooth counts, modules, heights. The single source of truth. |
| `src/lib/watches.ts` | The four watches of the collection as one parametric description each. |
| `src/hero/` | The WebGL hero: part builders, the ink-to-metal material, lighting, depth of field, the scene controller. |
| `src/plates/plates.tsx` | The SVG plates. Drawn from `calibre.ts`, so the drawing and the 3D object agree tooth for tooth. |
| `src/sections/` | The page: hero overlay, Il Movimento, La Collezione, La Bottega, Storia, Riserva, footer. |
| `src/studio/Studio.tsx` | The studio. The site photographs itself with it (see below). |
| `scripts/` | Asset pipeline: Higgsfield generation, media optimisation, catalogue stills, parchment tile, screenshots. |

## The hero

- **24 parts, modelled in code.** Lathed, extruded and swept geometry, no imported meshes. The gear
  train is real: 80/10, 64/8, 60/8, 72/6, with centre distances from the modules, so the teeth mesh.
  The escapement beats at 21,600 A/h, the balance swings 270° each way, the hands show your local time.
- **The sketch becomes the object.** Every material carries an `ink` uniform. At 1 it is a sepia
  drawing: a tonal wash from the surface's own colour, cross-hatching in the shadows, a line at each
  silhouette and edge. At 0 it is the physically based surface. Each part resolves as it leaves the page.
- **Four movements.** A flat plan drawing on the parchment; the stack lifting off it; a descent down the
  stack, part by part, as the visitor scrolls, each with its hand-lettered note; and the assembled,
  ticking watch. The stack is deliberately taller than the window, so every part is seen large.
- **Lighting.** The studio is an HDR panorama painted in code (`studioEnv.ts`) and prefiltered once: a
  dark room, a soft key, a graded sweep for the flat faces of wheels and bridges, hard strips for
  polished edges, and warm parchment where the page is. Nothing is downloaded.
- **Pipeline.** On capable machines the scene renders to a multisampled float target, then one pass
  adds depth of field and a soft-knee tone curve that leaves ink and paper tones untouched. Smaller
  devices render directly, with lighter geometry, smaller textures and no depth of field.
- **Fallbacks.** With `prefers-reduced-motion`, or without WebGL 2, the hero is a still illustration
  and the plates are shown fully drawn.

Interaction: point at a part (or tap it) for its annotation, drag to orbit, scroll to walk the stack and then assemble it. The
ruler on the right edge lists every part and is the keyboard route into the annotations.

## Photography and film

The workshop photography, the notebook plates, the detail photographs beside each watch, the parchment
under the hero and the three film loops are generated through the Higgsfield API
(`api.higgsfield.ai`: Soul for stills, Kling 2.5 Turbo for image-to-video). One prompt suffix carries
the look across all of them: north window light, parchment and sepia, midnight shadows, shallow focus.

```bash
npm run assets:generate
```

`scripts/higgsfield.mjs` holds every prompt, submits the requests, polls and downloads the originals;
`scripts/optimize-media.mjs` trims mats, crops, resizes to WebP and turns each five-second clip into a
forward-and-back loop that closes without a cut. In this environment the credentials are supplied by
the proxy; elsewhere set `HF_AUTH="Key <id>:<secret>"`.

Two honest limits. The API returns stills at about two thousand pixels on the long side and offers no
separate upscale, so that is the ceiling. And the model writes nonsense on watch dials, so three of the
four watch photographs are close details rather than full faces; the catalogue image of each watch is
the render described below, which shows the dial as designed.

## The studio

The catalogue stills and the reduced-motion illustration are rendered from the same model as the hero.
With a dev server running:

```bash
BASE=http://localhost:5173 npm run assets:stills
```

The studio is also reachable by hand:

- `/?studio=still&watch=tirreno` (also `codice`, `lungarno`, `doppiofuso`)
- `/?studio=hero&intro=1&scroll=0.36&part=balance` (any moment of the hero, frozen)

The scripts use Playwright with a local Chromium and `ffmpeg`; they are a build-time convenience and
the site does not depend on them.

## Stack

Vite, React, TypeScript, Three.js through React Three Fiber, GSAP ScrollTrigger, Lenis.
Fonts: Cormorant Garamond and Cormorant SC, Italianno, Jost, through Fontsource.
