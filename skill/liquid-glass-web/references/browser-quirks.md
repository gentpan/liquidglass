# Compatibility, performance and measurements

Measured in 2026-09 with Chrome 153, the macOS 27.2 system WebKit (the same engine as Safari 27.2) and Firefox 156. Items marked "Aave" come from Aave's article; items marked "measured" were found with minimal A/B pages while building the bundled engine and liquidglass.dev.

Contents: symptoms · units and scale · WebKit caching and map loading · performance · video · verification pitfalls

## Symptoms

| Symptom | Engine | Cause | Fix |
|---|---|---|---|
| The element turns completely blank once the filter is attached | WebKit | filter uses `primitiveUnits="userSpaceOnUse"` (measured: not even a single feFlood renders) | use `objectBoundingBox`; divide every coordinate by the element's size |
| One axis bends much more than the other, or strength differs between browsers | all | each engine converts bounding-box `scale` differently | see "Units and scale" |
| Glass freezes or shows an old shape | WebKit | filter output cached per filter id (Aave) | new id on every update (`-v1`, `-v2`, …) |
| Blank on first appearance, fixed after the next interaction | WebKit | the feImage data URL loads asynchronously and the empty result is cached (measured) | decode with `new Image().decode()` first, then set href; re-issue the id ~60 ms and ~250 ms after a swap |
| Lens missing during a continuous squish | all | every frame waits for its own new map to decode and none ever does (measured) | show the newest map that has decoded; it may lag a frame or two |
| Whole content slightly shifted or greyed | all | missing `color-interpolation-filters="sRGB"`; in linearRGB 128 is not "no bend" | set sRGB on `<filter>` |
| Square corners on the lens, frost leaking past the radius | all | rectangular feFlood used as the mask | mask with the map's alpha (`in` / `out` composites) |
| Transparent areas darken or brighten with chroma | all | the three channel passes add in premultiplied space and triple alpha | give the glass layer an opaque background (or set chroma 0) |
| Filter has no effect at all | some | the `<svg>` holding the filters is `display:none` | `width=0 height=0; position:absolute` instead |
| Lens cut off near the element's edge | all | filter output is clipped to the border box | give the refracted layer margin (`--bleed`) |
| Large areas break into tiles or vanish | WebKit | size cap on a filter's input, varies by version (Aave) | keep filtered surfaces small; never filter the whole page |
| Glass over video doesn't refract | WebKit | `<video>` is composited on the GPU and never enters the SVG filter pipeline (Aave) | WebGL (`glass-webgl.js`) |
| Lens edges shimmer while moving | Blink | sub-regions on fractional pixels | snap coordinates to device pixels (done in the engine) |
| Page stays `about:blank` in Safari/WKWebView, fine in Chrome | WebKit | the dev server runs on a browser-blocked port such as 4190 (measured) | use another port (4180, 4210, 5173 …) |
| Spring animations crawl when frames are slow or throttled | all | integrating with a capped `dt` loses wall-clock time (measured) | fixed 1/120 s sub-steps per frame, capped at 0.1 s (done in `createSpring`) |

## Units and scale (measured)

With `primitiveUnits="objectBoundingBox"` the sub-region x/y/width/height are fractions of the element's size in all three engines. `feDisplacementMap`'s `scale` is not. Measured with a constant map (R = 255 or G = 255), `scale = 0.2`, moving a 2 px line:

| Engine | x offset | y offset |
|---|---|---|
| Blink | scale × width | scale × width |
| WebKit | scale × width | scale × height |
| Gecko | scale × √((w² + h²)/2) | same |

To bend `px` pixels on both axes (map values span ±0.5, so scale = 2 × px):

- Blink: `scale = 2px / width`
- Gecko: `scale = 2px / √((w² + h²)/2)`
- WebKit: `scale = 2px / min(w, h)`, then squeeze the map's R by `min/w` and G by `min/h` towards 0.5: `feColorMatrix values="kx 0 0 0 (1-kx)/2  0 ky 0 0 (1-ky)/2  0 0 1 0 0  0 0 0 1 0"`. The factors are ≤ 1, so values only compress, never clip.

Blur `stdDeviation` in bounding-box units takes two values: `blur/width blur/height`.

Engine detection by UA: `userAgentData.brands` containing Chromium → Blink; `Firefox/` → Gecko; `AppleWebKit/` without `Chrome/` → WebKit. Every iOS browser is WebKit (their UAs say CriOS, FxiOS).

## WebKit caching and map loading

- Re-issuing the id: rename the same `<filter>` element and set `filter: url(#new-id)` on the element in the same frame. The old id need not survive.
- Every map change is a new data URL. Decode it through an `<img>` (`decode()`) before writing it into `feImage`; this also avoids a blank frame in Blink.
- After the swap WebKit loads its own copy and does not repaint when that load lands, so re-issue the id again ~60 ms and ~250 ms later.
- Leave the element unfiltered until the first map is ready — normal content beats a blank element.

## Performance

- **Moving never redraws the map** — only sub-region fractions change. This is what keeps Aave's slider at full frame rate on phones.
- **Reshaping redraws**: only the top-left quadrant is computed, then mirrored (x bend negated across the vertical axis, y bend across the horizontal one). Maps are LRU-cached by shape and optics, so a switch toggling between two states hits the cache.
- `mapScale` defaults to devicePixelRatio capped at 2. For animations that request a new map every frame, 1 cuts the work to a quarter.
- Every lens-related primitive is restricted to the lens rectangle, so cost scales with the lens, not the element. Aave saw sub-pixel flicker in Blink when restricting the highlight pass; with device-pixel snapping it did not reproduce here. If it does, widen that pass's sub-region to the whole element.
- **Skip no-op updates.** Every flush re-issues the id, which repaints the glass. Pages with many glass elements call `update()` on every scroll frame; the engine returns early when nothing changed, and backdrop copies only rewrite styles when their offset changes.
- `will-change: filter` on filtered elements; keep a page to a few dozen glass elements at most.

## Video and canvas

- WebKit never runs SVG filters on a playing `<video>`: use WebGL with the video as a texture, one quad per lens, sampling the same displacement map (`renderLensMap` returns a canvas that uploads directly).
- Fragment shaders work in CSS pixels and need highp (`#ifdef GL_FRAGMENT_PRECISION_HIGH`); mediump misplaces samples on wide canvases. A uniform used in both shaders must have the same precision in both or linking fails — use separate uniforms.
- Cross-origin video needs `crossorigin="anonymous"` plus CORS headers, or `texImage2D` throws SecurityError.

## Verification pitfalls

- **Chrome headless** `--virtual-time-budget` screenshots are fast but can capture springs mid-animation and states that never occur for a user (measured: a menu that looked half-open with a stretched tint). Use `scripts/chrome-shot.mjs`, which drives Chrome in real time over CDP, to check hover/press/open states. `--dump-dom` produces no frames at all, so rAF-driven state never appears in it.
- **WebKit**: `scripts/snap-webkit.swift` (WKWebView uses Safari's engine). The window must be on screen (nearly transparent, click-through), otherwise WebKit pauses rAF; it is still throttled, so give animations time.
- **Firefox headless** `--screenshot` shoots on the load event, before the glass exists. Serve with `scripts/serve.py` and add `?hold=2500` to hold the load event back. Headless screenshots also leave WebGL canvases blank — read pixels back in the page instead. Always pass `--no-remote --profile <temp dir>` so it doesn't attach to the user's running Firefox.
- **Hidden tabs or panes pause rAF**: nothing gets filtered there, which says nothing about the code.
- Ports on the browsers' blocked list (4190 among them) fail silently in WebKit.
