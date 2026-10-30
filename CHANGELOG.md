# Changelog

## 1.0.1

### Fixed
- `<lg-switch>`: setting `el.checked` now always applies. After a click it could be ignored, because the attribute and the input disagreed.
- `<lg-segmented>`: setting `el.value` before the element is connected no longer throws.
- Importing the library on a server (Next.js, Nuxt and other SSR setups) no longer throws `HTMLElement is not defined`.
- `<lg-menu>`: `data-shortcut` is inserted as text, not HTML.
- `<lg-slider>`: `min`, `max` and `step` changes after creation are applied.
- Engine: `curvature` below 1 and `ior` at or below 1 are clamped instead of producing a broken map.

### Added
- `package.json` (npm-ready), TypeScript declarations for every module, smoke tests and CI.
- Pinned CDN URLs through jsDelivr and git tags (see README).
- `install-skill.sh`: `LG_REF=<tag>` pins a release; an existing copy is kept as `liquid-glass-web.bak`.

### Docs
- Working React/Next.js and Vue (Vite) examples.
- Toast `tone` options, size claim (about 22 KB gzipped), text contrast and screen-reader fixes on the site.

## 1.0.0

First release.
