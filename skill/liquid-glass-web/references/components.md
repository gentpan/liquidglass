# liquidglass.dev web components

`assets/components.js` (also hosted at `https://liquidglass.dev/lib/components.js`) defines light-DOM custom elements on top of the engine. They need `liquid-glass.js` in the same directory. Styles are injected once; theme them with the `--lg-*` custom properties below. Full docs with live demos: https://liquidglass.dev/docs/.

Contents: loading · backdrops · theming · each element · optics attributes

## Loading

```html
<script type="module" src="https://liquidglass.dev/lib/components.js"></script>
<!-- or self-host: copy components.js and liquid-glass.js side by side -->
```

The module also re-exports `createGlass`, `createSpring`, `renderLensMap`, `engine`, `DEFAULTS`, and exports `toast`. React: import it in a client-side `useEffect`; Vue: set `compilerOptions.isCustomElement = (t) => t.startsWith('lg-')`.

## Backdrops (glass over images)

Button, panel, navbar, menu bar, menus, toast and dock refract what is behind them. Mark it:

```html
<div class="stage" data-lg-backdrop="img">      <!-- empty value = the container's own CSS background -->
  <img src="photo.jpg" alt="">
  <lg-panel radius="24">…</lg-panel>
</div>
<lg-button backdrop="#wallpaper">Continue</lg-button>   <!-- or point one element at a selector -->
```

With a marked backdrop every engine refracts (an aligned copy is bent). With none, Chromium refracts via `backdrop-filter` and WebKit/Gecko fall back to `--lg-fallback` (frosted blur). The copy follows scroll/resize and `transform: translate()`; don't scale glass with `transform: scale()`.

## Theming

| Property | Default | Used for |
|---|---|---|
| `--lg-accent` | #0a84ff | slider fill, selected labels, menu highlight |
| `--lg-on` | #34c759 | switch track when on |
| `--lg-surface` | #ffffff | colour behind a control; `transparent` on glass or photos (chroma then turns off) |
| `--lg-track`, `--lg-track-off` | #e5e7eb, #d1d5db | slider/segmented track, switch off |
| `--lg-tint` | rgb(255 255 255 / .14) | colour over glass; use a dark tint (e.g. rgb(17 24 39 / .32)) under white text |
| `--lg-tint-strong` | rgb(255 255 255 / .5) | tint for `tone="light"` |
| `--lg-indicator` | rgb(255 255 255 / .6) | navbar selection pill |
| `--lg-text`, `--lg-on-glass` | #111827, #fff | text on light / dark glass |
| `--lg-shadow-1`, `--lg-shadow-2` | — | thumb and glass shadows |
| `--lg-fallback` | blur(16px) saturate(1.6) | backdrop-filter where refraction is impossible |
| `--lg-toast-top` | 16px | toast offset from the top of its container |

## Elements

**`<lg-switch checked disabled name value aria-label>Label</lg-switch>`** — native checkbox; thumb is solid white at rest and turns to glass while pressed. `checked` property; bubbling `change` from the input.

**`<lg-slider min max step value name label disabled>`** — native range input; gentle bend so the fill reads as a value. `value` property (number); `input`/`change` bubble.

**`<lg-segmented value label>` with `<button value>` children** — radio group, glass indicator springs between options, arrow keys move it. `value` property, `change` event (`detail.value`, `detail.index`), `refresh()` after relabelling.

**`<lg-button tone="clear|tinted|light" href target type disabled radius backdrop>`** — glass capsule that squishes on press; `href` renders a link.

**`<lg-panel tone="light" radius backdrop>`** — frosted card (default blur 2; `blur="0"` for clear glass). Controls inside it should use `--lg-surface: transparent`.

**`<lg-navbar tone="light">` with `<a>` or `<button>` children** — glass capsule; indicator follows the pointer and rests on `aria-current="page"`. `setCurrent(i)`, `refresh()`.

**`<lg-menubar>` with `<lg-menu label="File">` children** — floating glass-rod bar; menus open as frosted panels with a sliding glass highlight. Items are `<button>` (optional `data-shortcut`, `value`) and `<hr>`. `select` event on `lg-menu` (bubbles; `detail.item`, `detail.value`); `show()`, `close()`; arrow keys, Enter, Escape.

**`toast(message, { icon, duration, container, tone, backdrop })`** — drops in on a spring and stretches as it lands; polite live region. `icon`: `check | info | alert | bell | '<svg…>' | null`; `duration` ms (0 = sticky; click dismisses); `container` defaults to `document.body` (fixed). Returns `{ close(), element }`.

**`<lg-dock>` with icon `<button>` children** — glass shelf; a magnifying dome lens follows the pointer or keyboard focus.

**`<lg-lens width height size radius x y>` wrapping content** — lens follows the pointer, rests at `x`/`y` (%). Content needs an opaque background. `configure({ width, height, radius, refraction, … })`, `moveTo(x, y)`.

## Optics attributes

Every glass element accepts `refraction`, `bezel`, `curvature`, `ior`, `chroma`, `blur`, `specular`, `specular-width`, `light-angle` to override its defaults (meaning in optics.md).
