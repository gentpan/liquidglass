# Code for each pattern

All code is condensed from the verified implementations in `assets/demo.html` and `assets/components.js`. Style values use placeholder tokens (`--surface`, `--shadow-2`, …); swap in the project's own.

Contents: A wrap · B overlay copy (switch / slider / segmented) · C backdrop copy · D backdrop · E WebGL · framework wiring

---

## A. Wrap: a lens moving over content

The filtered element (surface) holds the real content. Pixels outside the lens pass through untouched: text stays selectable, links clickable.

```html
<div class="lens-host">                          <!-- position:relative; overflow:hidden -->
  <div class="lens-surface">…real content…</div>  <!-- filtered; needs an opaque background -->
  <div class="lens-rim" aria-hidden="true"></div> <!-- shadow only -->
</div>
```

```css
.lens-host { position: relative; overflow: hidden; touch-action: none; }
.lens-surface { position: absolute; inset: 0; background: var(--surface); }
.lens-rim { position: absolute; left: 0; top: 0; pointer-events: none; box-shadow: var(--shadow-2); }
```

```js
import { createGlass, createSpring } from './liquid-glass.js';

const optics = { width: 180, height: 120, radius: 60, refraction: 28, bezel: 0.6, curvature: 4, chroma: 0.15, specular: 0.5 };
const glass = createGlass(surface, optics);
const pos = { x: 200, y: 120 };
let press = 0;

function render() {
  // squish while pressed: wider and shorter
  const w = optics.width * (1 + 0.1 * press);
  const h = optics.height * (1 - 0.06 * press);
  const x = Math.min(Math.max(pos.x - w / 2, 0), host.clientWidth - w); // stay inside: output is clipped
  const y = Math.min(Math.max(pos.y - h / 2, 0), host.clientHeight - h);
  const radius = Math.min(optics.radius, w / 2, h / 2);
  glass.update({ x, y, width: w, height: h, radius });
  Object.assign(rim.style, { width: `${w}px`, height: `${h}px`, borderRadius: `${radius}px`, transform: `translate(${x}px, ${y}px)` });
}
const pressSpring = createSpring(0, (v) => { press = v; render(); });

host.addEventListener('pointerdown', (e) => { host.setPointerCapture(e.pointerId); pressSpring.set(1); move(e); });
host.addEventListener('pointermove', (e) => { if (e.buttons) move(e); });
host.addEventListener('pointerup', () => pressSpring.set(0));
function move(e) {
  const r = host.getBoundingClientRect();
  pos.x = e.clientX - r.left;
  pos.y = e.clientY - r.top;
  render();
}
render();
```

When the lens must reach the element's edge, give the surface margin of at least `refraction` plus the squish growth.

---

## B. Overlay copy: controls

Three layers, always the same:

1. **Real control**: native `<input>` / `<button>`, transparent, stretched, on top so it receives events. Keyboard, screen readers and forms keep working.
2. **Refraction layer `.lg-refract`**: `aria-hidden`, holding a copy of what gets bent (track fill, highlighted labels), opaque background, clipped to the lens by `createGlass(…, { clip: true })`. It extends `--bleed` beyond the control so the lens can grow past its edge.
3. **Decoration**: the solid white thumb at rest (fades out while pressed) and the lens shadow (fades in).

### Switch

```html
<label class="lg-switch">
  <input type="checkbox" role="switch" aria-label="Wi-Fi">
  <span class="lg-switch-track" aria-hidden="true"></span>
  <span class="lg-refract" aria-hidden="true"><span class="lg-switch-fill"></span></span>
  <span class="lg-lens-shadow" aria-hidden="true"></span>
  <span class="lg-thumb" aria-hidden="true"></span>
</label>
```

```css
.lg-switch { --p: 0; --bleed: 16px; position: relative; display: inline-block; width: 64px; height: 28px; }
.lg-switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 4; }
.lg-switch-track, .lg-switch-fill { border-radius: 14px; background: color-mix(in srgb, var(--track-off), var(--track-on) calc(var(--p) * 100%)); }
.lg-switch-track { position: absolute; inset: 0; }
.lg-refract { position: absolute; pointer-events: none; background: var(--surface); z-index: 1; }
.lg-switch .lg-refract { left: calc(-1 * var(--bleed)); top: calc(-1 * var(--bleed)); width: calc(64px + 2 * var(--bleed)); height: calc(28px + 2 * var(--bleed)); }
.lg-switch-fill { position: absolute; left: var(--bleed); top: var(--bleed); width: 64px; height: 28px; }
.lg-thumb { position: absolute; left: 0; top: 0; background: var(--surface); box-shadow: var(--shadow-1); pointer-events: none; z-index: 3; }
.lg-lens-shadow { position: absolute; left: 0; top: 0; box-shadow: var(--shadow-2); pointer-events: none; z-index: 2; opacity: 0; }
.lg-switch input:focus-visible ~ .lg-thumb { outline: 2px solid var(--focus); outline-offset: 2px; }
```

```js
function glassSwitch(root) {
  const input = root.querySelector('input');
  const [refract, shadow, thumb] = ['.lg-refract', '.lg-lens-shadow', '.lg-thumb'].map((s) => root.querySelector(s));
  const bleed = 16;
  const glass = createGlass(refract, { clip: true, refraction: 10, bezel: 0.9, curvature: 3, chroma: 0.2, specular: 0.7, specularWidth: 1.5 });
  let x = input.checked ? 1 : 0, v = 0, p = 0;
  const lerp = (a, b, t) => a + (b - a) * t;

  function render() {
    const stretch = Math.min(10, Math.abs(v) * 1.6);   // stretch with speed
    const w = lerp(36, 54, p) + stretch;
    const h = lerp(24, 36, p) - stretch * 0.2;
    const left = 20 + 24 * x - w / 2;                 // centre travels 20 → 44
    const top = 14 - h / 2;
    root.style.setProperty('--p', x.toFixed(3));
    glass.update({ x: left + bleed, y: top + bleed, width: w, height: h, radius: h / 2 });
    for (const el of [thumb, shadow]) Object.assign(el.style, { width: `${w}px`, height: `${h}px`, borderRadius: `${h / 2}px`, transform: `translate(${left}px, ${top}px)` });
    thumb.style.opacity = String(1 - p);  // solid white at rest, glass while pressed
    shadow.style.opacity = String(p);
  }
  const xs = createSpring(x, (val, vel) => { x = val; v = vel; render(); }, { stiffness: 420, damping: 30 });
  const ps = createSpring(0, (val) => { p = val; render(); }, { stiffness: 600, damping: 36 });
  input.addEventListener('pointerdown', () => ps.set(1));
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) input.addEventListener(t, () => ps.set(0));
  input.addEventListener('change', () => xs.set(input.checked ? 1 : 0));
  render();
}
```

### Slider

Differences from the switch:

- The native `<input type="range">` is stretched and transparent; size its native thumb like the visual one (`::-webkit-slider-thumb` and `::-moz-range-thumb`, `width: 36px`) so dragging feels right.
- The refraction layer holds **a copy of the track and fill**, aligned with the real one plus the `--bleed` offset.
- Drive the spring from the `input` event: `ts.set(input.valueAsNumber / 100)`; thumb centre is `18 + t * (width - 36)`.
- Keep the bend gentle (`refraction: 6`): the fill under the glass has to read as a value, not just a highlight.

### Segmented control / tab indicator

- Real buttons: `role="radio"` inside `role="radiogroup"`, with `aria-checked`, roving tabindex and arrow keys.
- The refraction layer uses **exactly the same layout** as the buttons (same flex, padding, gap, font weight — only colour differs) and holds "all selected" copies of the labels on the selected background. Wherever the lens rests, that option looks highlighted. Match every font property; a different weight changes text widths and the layers drift apart.
- The lens x comes from a spring; its width interpolates between neighbouring buttons (`offsetLeft`, `offsetWidth`).
- Thin bezel (`bezel: 0.35`, `refraction: 5`), or labels get mangled.
- On a translucent surface (a glass panel), give the refraction layer a translucent pill colour and set chroma 0.

---

## C. Backdrop copy: glass over a known backdrop

The card holds a copy of the page backdrop aligned pixel-for-pixel; that copy is what gets refracted. Works in every engine whenever the backdrop is known (image, SVG illustration, CSS background).

```html
<div class="stage">                                  <!-- the backdrop image lives here -->
  <div class="glass-card">
    <div class="glass-card-backdrop" aria-hidden="true"></div>  <!-- same image, filtered -->
    <div class="glass-card-tint" aria-hidden="true"></div>      <!-- 8–20 % white keeps text readable -->
    <div class="glass-card-body">…text…</div>                    <!-- not filtered, stays crisp -->
  </div>
</div>
```

```css
.stage { position: relative; overflow: hidden; background: url(bg.jpg) 0 0 / cover; }
.glass-card { position: absolute; left: 0; top: 0; border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-2); }
.glass-card-backdrop { position: absolute; inset: 0; background-image: url(bg.jpg); background-repeat: no-repeat; }
.glass-card-tint { position: absolute; inset: 0; background: rgb(255 255 255 / 0.16); }
.glass-card-body { position: relative; }
```

```js
createGlass(backdrop, { fit: true, radius: 24, refraction: 26, bezel: 0.35, curvature: 4, chroma: 0.12, specular: 0.55 });

function place(x, y) {
  card.style.transform = `translate(${x}px, ${y}px)`;
  // same size as the stage, opposite offset: registered with the real backdrop
  backdrop.style.backgroundSize = `${stage.clientWidth}px ${stage.clientHeight}px`;
  backdrop.style.backgroundPosition = `${-x}px ${-y}px`;
}
```

With `cover` backgrounds both the stage and the copy must paint at the same size, so the copy's `background-size` is the stage's pixel size (use `preserveAspectRatio="xMidYMid slice"` for SVG). For an `<img>` backdrop, clone the image and translate it by the difference of the two bounding rects (this is what `components.js` does, re-aligning on scroll and resize).

---

## D. Backdrop: over arbitrary DOM (real refraction in Chromium only)

```js
createGlass(navbar, { mode: 'backdrop', fit: true, radius: 16, refraction: 20, bezel: 0.4, chroma: 0, specular: 0.5,
  fallback: 'blur(16px) saturate(1.8)' });   // used in WebKit and Gecko
```

- Chromium gets `backdrop-filter: url(#…)` — real refraction. Other engines get the `fallback` frosted glass: a **degradation** — say so when handing over.
- Keep a tint and rim so the fallback still looks deliberate: `box-shadow: inset 0 1px 0 rgb(255 255 255 / .5), var(--shadow-2)`.
- If what's underneath is actually a known backdrop, use C and refract everywhere.

---

## E. WebGL: video and canvas

```js
import { createGlassRenderer } from './glass-webgl.js';

const renderer = createGlassRenderer(canvas, video);   // canvas over the video, same aspect ratio
renderer.setLenses([
  { x: cx - 32, y: cy - 32, width: 64, height: 64, radius: 32, refraction: 14, bezel: 0.8, curvature: 3, chroma: 0.25, specular: 0.8, specularWidth: 1.5 },
  { x: 24, y: h - 28, width: w - 48, height: 12, radius: 6, refraction: 8, bezel: 1 },   // scrubber
]);
renderer.start();              // redraw every frame; renderer.render() for one frame
// relayout: setLenses again; move one lens: renderer.updateLens(i, { x })
```

- Put real `<button>`s over the lenses (transparent background, white icons) for clicks, focus and screen readers; WebGL only paints.
- Cross-origin video needs `crossorigin="anonymous"` and CORS headers.
- The source `<video>` can sit under the canvas or at `opacity: 0`, but not `display: none` — some browsers stop decoding.

---

## Framework wiring

Create after mount, destroy on unmount; per-frame updates call `glass.update()` directly, never through component state.

**React** (Next.js: add `'use client'`)

```jsx
import { useEffect, useRef } from 'react';
import { createGlass } from '@/lib/liquid-glass.js';

export function useGlass(options) {
  const ref = useRef(null);
  const glass = useRef(null);
  useEffect(() => {
    glass.current = createGlass(ref.current, options);
    return () => glass.current?.destroy();
  }, []); // create once; change parameters with glass.current.update()
  return [ref, glass];
}
```

**Vue**

```js
const el = ref(null);
let glass;
onMounted(() => { glass = createGlass(el.value, options); });
onBeforeUnmount(() => glass?.destroy());
```

**Svelte action**

```js
export function glass(node, options) {
  const g = createGlass(node, options);
  return { update: (next) => g.update(next), destroy: () => g.destroy() };
}
```
