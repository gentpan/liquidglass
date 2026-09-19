# Optics, map encoding and the filter graph

Read this to tune parameters, explain an effect, or hand-write a filter where the bundled engine can't be used.

## Parameters

| Parameter | Default | Meaning | Typical |
|---|---|---|---|
| `x` `y` `width` `height` | — | lens rectangle, CSS px, relative to the element's border box | — |
| `radius` | 32 | corner radius; half the short side = capsule/circle | 0 – short/2 |
| `refraction` | 18 | maximum bend at the rim, px | 4–40 |
| `bezel` | 0.6 | curved-rim width as a share of the half short side; 1 = full dome (a rod for thin bars) | 0.3–1 |
| `curvature` | 4 | surface profile exponent: 2 circular, 4 squircle-like, higher = steeper rim | 2–6 |
| `ior` | 1.5 | index of refraction; how fast the bend fades inward | 1.3–2 |
| `invert` | false | concave lens (content pushed outward) | — |
| `chroma` | 0.12 | colour fringe: blue bends (1 + chroma)× as far as red; 0 skips the extra passes | 0–0.3 |
| `blur` | 0 | frost, px | 0–8 |
| `specular` | 0.45 | rim highlight strength; 0 skips the pass | 0–1 |
| `specularWidth` | 2 | width of the crisp rim line, px (a softer glow extends ~5×) | 1–4 |
| `lightAngle` | -120 | light direction in degrees; 0 = from the right, -90 = from the top. The rim facing the light is brightest, the far rim reflects dimly | — |
| `mapScale` | 0 | map pixels per CSS px; 0 = devicePixelRatio capped at 2 | 1–2 |

## The displacement map

For every pixel of the lens:

1. Signed distance `d` to the rounded rectangle (negative inside) and outward normal `n`.
2. `s = -d / (bezel × min(w, h) / 2)`: depth into the curved band (0 at the rim, 1 where the flat top starts).
3. Surface height `h(s) = (1 - (1-s)^k)^(1/k)` with `k = curvature`; its slope gives the tilt θ. A vertical ray refracts to `asin(sin θ / ior)`; the lateral offset grows with `tan(θ - refracted)`. Normalised to `m(s) ∈ [0,1]`: maximal at the rim, 0 on the flat top.
4. Encoding: `R = 128 + 127·m·nx`, `G = 128 + 127·m·ny` (normal pointing inward). A convex lens samples from **further inside** near the rim, so rim content is magnified and bent.
5. `B = 128 + 127·highlight`, highlight = `specular × (crisp² + 0.3·glow²) × shade(n·L)`, where crisp/glow fall off over `specularWidth` and 5× that, and `shade(f) = 0.12 + 0.88·(f > 0 ? f : 0.4·(-f))`.
6. Alpha = coverage with one map pixel of anti-aliasing; transparent outside, composited onto neutral grey in the filter.

The rounded rectangle is symmetric in both axes: compute the top-left quadrant and mirror it — R becomes `256 - R` across the vertical axis, G becomes `256 - G` across the horizontal one (mirrored around 128 so neutral stays 128). The highlight is computed per quadrant because `n·L` differs.

`feDisplacementMap`: `P'(x,y) = P(x + scale·(R/255 - 0.5), y + scale·(G/255 - 0.5))`, so `scale` = 2 × the maximum offset. Converting that to bounding-box units per engine: browser-quirks.md.

## Filter graph

```
neutral   = feFlood rgb(128,128,128)                       [lens sub-region]
lensShape = feImage(map) preserveAspectRatio="none"         [lens sub-region]
map       = lensShape over neutral                          [lens sub-region]
bend      = feColorMatrix(map) squeezing R/G                [WebKit only]
frosted   = feGaussianBlur(SourceGraphic)                   [blur > 0; sub-region padded]
chN       = feDisplacementMap(frosted, bend, scale·kN) → feColorMatrix keeping one channel   (N = R, G, B)
refracted = chR + chG + chB                                 (feComposite arithmetic k2=1 k3=1)
rim       = feColorMatrix(map): RGB = 1, A = 2·B - 256/255
lit       = rim + refracted                                 (arithmetic k2=1 k3=1)
lens      = lit IN lensShape                                (clipped by the map's alpha)
outside   = SourceGraphic OUT lensShape
result    = lens OVER outside
```

`<filter filterUnits="objectBoundingBox" x=0 y=0 width=1 height=1 primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">`.

## Minimal hand-written version

Refraction only (no chroma or highlight), for static pages that can't run JavaScript. Generate the map offline with `renderLensMap(options, 2).canvas.toDataURL()`:

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="glass-v1" filterUnits="objectBoundingBox" x="0" y="0" width="1" height="1"
          primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">
    <feFlood flood-color="rgb(128,128,128)" result="neutral"/>
    <feImage href="data:image/png;base64,…" preserveAspectRatio="none"
             x="0.25" y="0.2" width="0.5" height="0.6" result="lensShape"/>
    <feComposite in="lensShape" in2="neutral" operator="over" result="map"/>
    <feDisplacementMap in="SourceGraphic" in2="map" scale="0.12" xChannelSelector="R" yChannelSelector="G" result="refracted"/>
    <feComposite in="refracted" in2="lensShape" operator="in" result="lens"/>
    <feComposite in="SourceGraphic" in2="lensShape" operator="out" result="outside"/>
    <feComposite in="lens" in2="outside" operator="over"/>
  </filter>
</svg>
<div style="filter: url(#glass-v1)">…</div>
```

A static page can only write one `scale`, so the strength differs between engines unless the element is square. Use the engine for consistent results.
