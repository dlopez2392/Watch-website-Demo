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
| `scripts/` | Asset pipeline: parchment tile, product stills, the workshop film, screenshots. |

## The hero

- **24 parts, modelled in code.** Lathed, extruded and swept geometry, no imported meshes. The gear
  train is real: 80/10, 64/8, 60/8, 72/6, with centre distances from the modules, so the teeth mesh.
  The escapement beats at 21,600 A/h, the balance swings 270° each way, the hands show your local time.
- **The sketch becomes the object.** Every material carries an `ink` uniform. At 1 it is a sepia
  drawing: a tonal wash from the surface's own colour, cross-hatching in the shadows, a line at each
  silhouette and edge. At 0 it is the physically based surface. Each part resolves as it leaves the page.
- **Three states.** A flat plan drawing on the parchment, the exploded stack floating over it, and the
  assembled, ticking watch. Load plays the first transition; scroll scrubs the second.
- **Lighting.** The studio is built from light cards and baked once, with a parchment card behind the
  watch so polished steel reflects the page it floats over. Nothing is downloaded.
- **Pipeline.** On capable machines the scene renders to a multisampled float target, then one pass
  adds depth of field and a soft-knee tone curve that leaves ink and paper tones untouched. Smaller
  devices render directly, with lighter geometry, smaller textures and no depth of field.
- **Fallbacks.** With `prefers-reduced-motion`, or without WebGL 2, the hero is a still illustration
  and the plates are shown fully drawn.

Interaction: point at a part (or tap it) for its annotation, drag to orbit, scroll to assemble. The
ruler on the right edge lists every part and is the keyboard route into the annotations.

## The studio

Every image and the film on the site are rendered from the same model as the hero, so one look runs
through all of them. With a dev server running:

```bash
BASE=http://localhost:5173 npm run assets:stills
```

```bash
BASE=http://localhost:5173 npm run assets:film
```

The studio is also reachable by hand:

- `/?studio=still&watch=tirreno` (also `codice`, `lungarno`, `doppiofuso`)
- `/?studio=hero&intro=0.45&scroll=0` (any moment of the hero, frozen)
- `/?studio=film`

The scripts use Playwright with a local Chromium and `ffmpeg`; they are a build-time convenience and
the site does not depend on them.

## Generated media

The brief called for generated photography and film through Higgsfield. The account had 0.1 credits
when this was built, less than the cheapest single image, so nothing was generated there. The stills
and the film loop are renders of the site's own model instead. The slots are ordinary files in
`public/img` and `public/video`; generated assets can replace them without touching the code.

## Stack

Vite, React, TypeScript, Three.js through React Three Fiber and drei, GSAP ScrollTrigger, Lenis.
Fonts: Cormorant Garamond and Cormorant SC, Italianno, Jost, through Fontsource.
