---
name: liquid-glass-web
description: Build refractive "liquid glass" UI for the web (Apple Liquid Glass style) that renders the same in Chrome, Safari/iOS and Firefox — SVG feDisplacementMap applied through CSS filter to the content itself, runtime displacement maps, chromatic fringe and rim highlights, press/squish springs, WebKit-specific fixes, WebGL for video. Ships the liquidglass.dev web components (switch, slider, segmented, button, panel, navbar, menu bar, toast, dock, lens), the zero-dependency engine, a reference page and a three-engine screenshot script. Use whenever a web or front-end task (HTML/CSS/React/Vue/Svelte) asks for liquid glass, glass refraction, a glass lens or magnifier, glassmorphism that should actually bend light, or Apple-style glass switches, sliders, segmented controls, tab indicators, cards, navbars, menus, toasts or docks — and when a backdrop-filter glass effect does not show up in Safari or Firefox. Not for native SwiftUI/UIKit apps (use the system glassEffect there).
---

# Liquid glass for the web

Goal: glass that really bends light, like Apple's Liquid Glass, rather than a blur — and looks the same in Chromium, WebKit (Safari and every iOS browser) and Gecko (Firefox). The approach follows Aave Labs' [Building Glass for the Web](https://aave.com/design/building-glass-for-the-web); the bundled code is an independent implementation, verified screenshot-by-screenshot in all three engines. Live site and docs: https://liquidglass.dev.

## How it works

1. **Refraction goes on `filter: url(#id)`, not `backdrop-filter`.** `backdrop-filter: url()` only renders in Chromium. A plain `filter` referencing an SVG filter works everywhere, but it bends the element's *own* pixels — so whatever should be bent must be inside the glass element: the real content, or a decorative copy of it.
2. **The displacement map is generated at runtime from the lens shape.** Red/green = horizontal/vertical bend, blue = rim highlight, alpha = lens coverage, neutral grey 128 outside the lens. Pixels outside the lens pass through untouched, so text stays selectable and links clickable.
3. **Moving is cheap, reshaping regenerates.** Moving a lens only changes filter sub-region coordinates; the map is redrawn only when shape or optics change (cached, only a quarter computed).
4. **Surfaces without live DOM use WebGL with the same map.** Safari never runs SVG filters on a playing `<video>`; canvas content has no DOM either.

## Step 1 — pick the path

**Fastest: the ready-made web components.** If the project can load an ES module, use `assets/components.js` (copy it next to `assets/liquid-glass.js`, or load `https://liquidglass.dev/lib/components.js`). Elements: `lg-switch`, `lg-slider`, `lg-segmented`, `lg-button`, `lg-panel`, `lg-navbar`, `lg-menubar` + `lg-menu`, `toast()`, `lg-dock`, `lg-lens`. Usage, attributes and theming variables: [references/components.md](references/components.md).

**Custom glass:** use the engine (`createGlass`) with one of these patterns:

| Situation | Pattern | How |
|---|---|---|
| A lens moving over content you control (magnifier, hero, indicator on a card) | A wrap | Put the content inside the element; `createGlass(el, { x, y, width, height, radius })` |
| Switch, slider, segmented control, tab indicator | B overlay copy | Native control stays underneath; an `aria-hidden` copy on top with `clip: true` |
| Glass card/panel over a known backdrop (image, illustration, CSS background) | C backdrop copy | An aligned copy of the backdrop inside the card; `fit: true` |
| Glass over arbitrary scrolling DOM (fixed navbar) | D backdrop | `mode: 'backdrop'`: real refraction in Chromium, frosted blur elsewhere |
| `<video>`, canvas, WebGL scenes | E WebGL | `createGlassRenderer(canvas, source)` |

D is the only case that **cannot** refract in all three engines — tell the user instead of passing a blur off as refraction. If the backdrop is actually known (a fixed background image), use C. Full code for each pattern plus React/Vue/Svelte wiring: [references/patterns.md](references/patterns.md). A runnable reference page: `assets/demo.html`.

## Step 2 — use the bundled engine

- Copy `assets/liquid-glass.js` into the project (e.g. `src/lib/`); for pattern E also `assets/glass-webgl.js`. Both are dependency-free ES modules. Search for an existing `createGlass` first and reuse it.
- **Do not rewrite the filter from memory.** The file encodes fixes that were found by measurement (filter units, per-engine scale, WebKit caching). A rewrite almost always renders as a blank element in Safari. Modify it if needed, then re-verify with Step 5.

```js
import { createGlass, createSpring } from './lib/liquid-glass.js';

const glass = createGlass(surface, { x: 40, y: 40, width: 180, height: 120, radius: 60, refraction: 28 });
glass.update({ x: 120 });        // move: coordinates only, cheap
glass.update({ width: 200 });    // reshape: new map (cached)
glass.update({ hidden: true });  // remove the lens without destroying it
glass.destroy();                 // always on unmount
```

Options: `x y width height radius` (CSS px, relative to the element's border box), `refraction` (max rim bend in px), `bezel` (curved-rim width as a share of the half size), `curvature`, `ior`, `invert`, `chroma`, `blur`, `specular`, `specularWidth`, `lightAngle`, `mapScale`; plus `fit` (lens follows the element's size), `clip` (clip the element to the lens), `mode: 'backdrop'`, `fallback`, `sync`, `hidden`. Meaning and ranges: [references/optics.md](references/optics.md).

In frameworks: create after mount, `destroy()` on unmount; drive per-frame changes (drag, springs) by calling `glass.update()` directly, **not through component state** (that re-renders every frame). Create on the client only.

## Step 3 — make it read as liquid glass

- **Bend at the rim, flat in the middle.** `bezel` sets the width of the curved band; the flat centre keeps content readable. Glass over text (segmented, slider) uses a small `bezel` and small `refraction`; strong bends are for decorative highlights. A thin bar (menu bar) reads best as a **glass rod**: `bezel: 1`, `curvature: 2.5`, so the backdrop lenses across the whole height.
- **Light chroma** (0.1–0.25), only as a fringe at the rim.
- **Directional highlight + shadow.** `specular` draws a rim that is brightest facing the light and dimly reflects on the far side (default light from the upper left); add a decorative shadow element (`pointer-events: none`). On photos, tint the glass: a white tint (8–20 %) under dark text, a dark tint (~30 %) under white text — contrast has to come from the tint, not luck.
- **Motion makes it liquid.** Press → grow and squish (wider, shorter); drag → stretch with velocity; release → spring back (`createSpring`, which sub-steps so slow frames don't slow the animation). Switch and slider thumbs are **solid white at rest and turn into glass while pressed**, as on iOS.
- The glass layer needs an **opaque background** (chroma sums channels in premultiplied space and over-counts alpha on transparent pixels), and **room to grow**: filter output is clipped to the element's border box.

Starting values (from `assets/demo.html` and liquidglass.dev, checked in all three engines):

| Use | refraction | bezel | curvature | chroma | specular | notes |
|---|---|---|---|---|---|---|
| Lens over content / magnifier | 24–32 | 0.6 | 4 | 0.15 | 0.5 | 180×120, radius 60 |
| Switch thumb | 10 | 0.9 | 3 | 0.2 | 0.7 | 36×24 at rest → 54×36 pressed, specularWidth 1.5 |
| Slider thumb | 6 | 0.9 | 3 | 0.15 | 0.7 | gentle: the fill must stay readable |
| Segmented indicator | 5 | 0.35 | 4 | 0.2 | 0.6 | rim bends, labels stay legible |
| Menu bar (glass rod) | 20 | 1 | 2.5 | 0.2 | 0.9 | 44 px tall capsule, specularWidth 2.5 |
| Glass card over a photo | 24–26 | 0.3–0.35 | 4 | 0.1 | 0.5 | tint + level-2 shadow, blur 2 |
| Video controls (WebGL) | 14 | 0.8 | 3 | 0.25 | 0.8 | — |

When the project has a design system, shadows, tints and radii come from its tokens; the table only covers optics.

## Step 4 — rules that break an engine when ignored

The bundled engine already does all of this. Keep it when writing or changing filters:

1. `primitiveUnits="objectBoundingBox"`. WebKit renders any HTML element whose filter uses `userSpaceOnUse` primitives as **completely blank**.
2. In bounding-box units, `feDisplacementMap`'s `scale` is converted differently by each engine; compensate per engine (`bendScale`).
3. `color-interpolation-filters="sRGB"`, or 128 stops meaning "no bend" and everything shifts.
4. WebKit caches filter output per filter id: new id on every update; decode the map before swapping it in; re-issue the id shortly after a swap.
5. The `<svg>` holding the filters must not be `display: none`.
6. Keep filtered surfaces small; never filter the whole page. WebKit caps a filter's input size and breaks large areas into tiles.
7. `<video>` and canvas in Safari → WebGL.

Symptom → cause → fix, with the measurements: [references/browser-quirks.md](references/browser-quirks.md). Read it first whenever glass is blank, frozen, shifted or too strong on one axis in some browser.

## Accessibility and fallbacks

- Real controls stay native, focusable and labelled; copies and decoration are `aria-hidden="true"` with `pointer-events: none`; draw focus rings on the visible thumb (`input:focus-visible ~ .thumb`).
- `prefers-reduced-motion`: `createSpring` jumps straight to the target; don't add squish on top.
- `prefers-reduced-transparency` / `prefers-contrast: more`: stronger tint or a solid surface.
- Text on glass: at least 4.5:1, guaranteed by the tint layer.
- Without JavaScript the content renders normally — the filter is only attached once its map is ready.

## Step 5 — verify before handing over

1. Serve the page (the project's dev server, or `python3 scripts/serve.py <dir>`). **Avoid browser-blocked ports** (e.g. 4190, 6000, 6665–6669, 10080): WebKit silently refuses them and the page stays `about:blank`.
2. On macOS run `scripts/shoot.sh "<url>?hold=2500" <out-dir>` → Chrome (2x), WebKit (2x — the system WebKit is Safari's engine) and Firefox screenshots. **Crop and compare at full resolution**; don't judge from thumbnails. Check: the glass is present in all three, rims really bend, text outside the lens is crisp, controls line up with their copies.
   - `hold` only works with `serve.py`: `firefox --screenshot` fires on the load event, before the glass exists, unless the load event is held back.
   - Firefox headless screenshots omit WebGL canvases; read pixels back in the page to check WebGL there.
3. **Check interactive states in real time** with `node scripts/chrome-shot.mjs <url> out.png --actions '[{"type":"move","x":300,"y":200}]' --eval "js"`. Chrome's `--virtual-time-budget` screenshots can freeze springs mid-animation and show states no user will ever see.
4. Motion: two WebKit snapshots at different delays (5th argument of `snap-webkit`) — the lens must render in its new position and the filter id must change.
5. When possible, look at it on a real iPhone.
6. When unsure how something should behave, open `assets/demo.html` through `serve.py`: `?pressed` freezes pressed states, `?auto` animates everything.

## Files

- `assets/liquid-glass.js` — engine: map generation, filter graph, controller, springs
- `assets/components.js` — the liquidglass.dev web components (needs `liquid-glass.js` beside it)
- `assets/glass-webgl.js` — WebGL renderer (video, canvas)
- `assets/demo.html` — reference implementations of every pattern with a parameter panel
- `scripts/serve.py` — static server with `?hold=<ms>`
- `scripts/shoot.sh` — screenshots in Chrome, WebKit and Firefox
- `scripts/snap-webkit.swift` — WebKit snapshots via WKWebView
- `scripts/chrome-shot.mjs` — real-time Chrome driver for hover/press states
- `references/components.md` — the web components: markup, attributes, events, theming
- `references/patterns.md` — code for each pattern and framework wiring
- `references/browser-quirks.md` — compatibility, performance, measurements
- `references/optics.md` — map encoding, filter graph, parameters, writing a filter by hand
