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
| `src/plates/plates.tsx` | The SVG plates. Drawn from `calibre.ts` and `watches.ts`, so the drawing and the 3D object agree tooth for tooth. `/?plates` shows them all on one sheet. |
| `src/sections/` | The page: hero overlay, La Collezione, Il Movimento, La Bottega, Storia, Riserva, footer. |
| `src/studio/Studio.tsx` | The studio. The site photographs itself with it (see below). |
| `scripts/` | Asset pipeline: studio renders, Higgsfield photographs and films, media optimisation, screenshots. |

## The hero

- **24 parts, modelled in code.** Lathed, extruded and swept geometry, no imported meshes. The gear
  train is real: 80/10, 64/8, 60/8, 72/6, with centre distances from the modules, so the teeth mesh.
  The escapement beats at 21,600 A/h, the balance swings 270° each way, the hands show your local time.
- **Finished, not just shaped.** Every flat part is sorted into faces, flanks and bevels
  (`facetGroups` in `geo.ts`), so a bridge carries stripes on top, a satin flank and a polished
  anglage, and each jewel and screw sits in a polished sink cut by the same bevel. The hands are
  filed to a ridge, the indexes are small roofed bars, the seconds dial is a real well in the dial,
  and the dial's surface is a data texture: height, roughness and metalness in one map.
- **The sketch becomes the object.** Every material carries an `ink` uniform. At 1 it is a sepia
  drawing: a tonal wash from the surface's own colour, cross-hatching in the shadows, a line at each
  silhouette and edge. At 0 it is the physically based surface. Each part resolves as it leaves the page.
- **Five movements.** A flat plan drawing on the parchment; the stack lifting off it; a descent down
  the stack, part by part, as the visitor scrolls; at the escapement the movement is turned over in
  the hand, so the gilt bridges, the rubies and the blued screws face the reader; then the parts go
  home, seen through the caseback, and the watch is turned to its dial, ticking.
- **Lighting.** The studio is an HDR panorama painted in code (`studioEnv.ts`) and prefiltered once: a
  dark room, a north window with glazing bars as the key, graded sweeps above and below for the flat
  faces of wheels and bridges, hard strips for polished edges, and a dark shape where the camera
  stands. Dry surfaces (dial, leather) take most of their light from the key, so a hand throws a
  shadow on the dial. Nothing is downloaded.
- **Pipeline.** On capable machines the scene renders to a multisampled float target, then one pass
  adds depth of field and a tone curve that is the identity up to a knee (ink and paper arrive
  untouched) with a long photographic shoulder above it. Smaller devices render directly, with
  lighter geometry, smaller textures and no depth of field.
- **Contact shading.** Where one part stands over another (the flange at the edge of the dial, the
  foot of each applied index, the corner of the seconds well, the bridges over the mainplate) a baked
  ambient-occlusion map dims the light from the room. It is drawn in code from the same outlines as the
  parts, and it lifts as soon as the watch comes apart, since the shadow belongs to the assembled object.
- **Loading.** The page, its words and its drawing come first. The watch is fetched once the page has
  loaded and built when the browser is idle, or at once on the first scroll, touch or key; its shaders
  compile in parallel where the browser allows it.
- **Fallbacks.** With `prefers-reduced-motion`, or without WebGL 2, the hero is a still illustration
  and the plates are shown fully drawn.

Interaction: point at a part (or tap it) for its annotation, drag to orbit, scroll to walk the stack and then assemble it. The
ruler on the right edge lists every part and is the keyboard route into the annotations.

## Photography and film

Everything photographic is generated through the Higgsfield API (`api.higgsfield.ai`), in two ways.

**The watches are photographed from their own renders.** The studio (below) renders each watch and
the calibre from the parametric model; `scripts/hf-photo.mjs` uploads that frame and asks an
image-edit model (Marketing Studio Image, Sunburst) to make a photograph of it. The render fixes the
design, every letter on the dial and the camera; the model supplies light and material. That is why
the catalogue plates, the details beside them and the portrait of the Calibro V.31 show exactly the
watch the hero takes apart, engraving included. The photograph at the bench is made the same way
from the portrait of the calibre, and both films of the movement are Kling image-to-video started
from those two frames.

**The workshop is imagined.** The room, the hands polishing and bluing, the notebook sheets and the
parchment under the hero are text-to-image (Soul), with one short Kling clip. One prompt suffix carries the
look across all of them: north window light, parchment and sepia, midnight shadows, shallow focus.

```bash
BASE=http://localhost:5173 npm run assets:stills
```

```bash
npm run assets:photos
```

```bash
npm run assets:generate
```

In that order: the renders, the photographs made from them, then the workshop set and the films.
Each step keeps what it has already made; pass `--force` to `hf-photo.mjs` to photograph again.
`scripts/optimize-photos.mjs` and `scripts/optimize-media.mjs` cut, resize and encode for the web,
and turn each five-second clip into a forward-and-back loop that closes without a cut. In this
environment the credentials are supplied by the proxy; elsewhere set `HF_AUTH="Key <id>:<secret>"`.

Stills come back at about two thousand pixels on the long side, which is the ceiling for the plates.

The studio also frames a close-up of each watch (`npm run assets:stills -- macro`; prompts
`macro-<id>` in `hf-photo.mjs`, made only when named). When those photographs exist they are meant to
replace the detail insets, which are otherwise cut from the catalogue plates.

## The collection in the hand

Each watch in La Collezione can be turned in the hand (`src/sections/WatchViewer.tsx`): the same
parametric model as the hero, the head without its strap so the back can be seen (the Codice, the
Lungarno and the Doppio Fuso show their calibres through the sapphire, each engraved with its own
calibre and jewel count; the Tirreno's solid back carries an engraved wind rose), set to the visitor's time. Drag or use
the arrow keys; Home faces the dial, End shows the back, Escape returns to the photograph. Only one is
open at a time, it is loaded only when asked for, and it stops drawing when scrolled away.

## Su misura: the configurator

Riserva opens with the configurator (`src/sections/Configurator.tsx`, choices and prices in
`src/lib/configure.ts`). Choose the watch, then its case, dial, hands, strap and a line engraved by
hand round the caseback. Every choice resolves to a full `WatchSpec`, so the 3D watch beside the
choices is the same parametric model as the hero, rebuilt in the background and swapped in when it
is ready. The engraving is cut into the caseback texture, and typing it turns the watch over (with
the strap set aside) so it can be read.

The list is short on purpose: three dials a watch, the metals each case is made in, two finishes of
hands, six straps. There are no colour pickers. An order sheet keeps the reference, the price line by
line, the weeks at the bench and the month it would be delivered. The configuration is carried in the
address (`?c=codice~oro~notte~oro~seppia~A.R.`), so it can be sent to someone or reopened, and it
travels into the enquiry form below. Without WebGL 2 the choices, the order sheet and the form all
still work; the stage shows the photograph of the house version and says so.

## Motion

Everything that moves by itself (the running plates and the film loops) answers to one switch in the
bar at the top of the page (`src/lib/stillness.ts`). It starts on for visitors whose system asks for
less motion, and it is remembered for the next visit.

## The plates

Seven plates and four case drawings, all generated from the numbers in `calibre.ts` and `watches.ts`.
What a plate states, the model does: 80 teeth on a pinion of 10 turn the barrel once in eight hours;
64:8 and 60:8 make the fourth wheel turn once a minute; 72:6 and fifteen escape teeth give 21,600
beats an hour; a mainspring of eighteen and a half turns measures the 420 mm the copy quotes; the
calibre is 31.0 mm across and 5.9 mm high, as dimensioned; nineteen jewels are counted out under the
section they are drawn in. Each case drawing shows that watch's own dial, hands, bezel and profile.

Once a plate has drawn itself in, it runs (`useLive` in `plates.tsx`). The going train takes up the
time of day and turns in real time; the escapement is shown at an eighth of its speed and the balance
at a sixth, so the beat and the breathing of the spring can be followed; the winding plate winds a
quarter turn of the ratchet at a time, the click riding over each tooth; and the hands on each case
drawing sweep from ten past ten to the visitor's own time and keep it. Nothing moves off screen, for a
visitor who has asked for less motion, or while the pause in the top bar is on.

- `/?plates` (all of them, fully drawn; add `&move` to set them running)
- `/?plates=escapement` (one alone: `train`, `escapement`, `balance`, `winding`, `section`, `finish`, or a watch id)

## The studio

The frames behind the photographs, and the reduced-motion illustration, are rendered from the same
model as the hero. The studio is also reachable by hand, with a dev server running:

- `/?studio=still&watch=tirreno&dark=1&bg=111a33` (also `codice`, `lungarno`, `doppiofuso`)
- `/?studio=still&watch=codice&view=back&hide=caseback,strap,buckle&zoom=1.3&dark=1&bg=111a33`
- `/?studio=hero&intro=1&scroll=0.42&part=bridges&bg=ece0c8` (any moment of the hero, frozen)

The scripts use Playwright with a local Chromium and `ffmpeg`; they are a build-time convenience and
the site does not depend on them.

## Stack

Vite, React, TypeScript, Three.js through React Three Fiber, GSAP ScrollTrigger, Lenis.
Fonts: Cormorant Garamond and Cormorant SC, Italianno, Jost, through Fontsource.
