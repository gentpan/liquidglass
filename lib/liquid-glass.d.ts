export interface GlassOptions {
  /** Lens rectangle in CSS px, relative to the target's border box. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  /** Maximum bend at the rim, CSS px. */
  refraction?: number;
  /** Curved rim width as a fraction of the lens half-size; 1 = full dome. */
  bezel?: number;
  /** Rim profile exponent (>= 1): 2 = circular, 4 = squircle-like. */
  curvature?: number;
  /** Index of refraction (> 1). */
  ior?: number;
  /** true = concave lens. */
  invert?: boolean;
  /** Colour fringe; 0 skips the extra passes. */
  chroma?: number;
  /** Frost, CSS px. */
  blur?: number;
  /** Rim highlight 0..1. */
  specular?: number;
  /** Rim highlight width, CSS px. */
  specularWidth?: number;
  /** Degrees; 0 = light from the right, -90 = from the top. */
  lightAngle?: number;
  /** Map pixels per CSS px; 0 = devicePixelRatio capped at 2. */
  mapScale?: number;
}

export interface CreateGlassOptions extends GlassOptions {
  /** 'content' bends the target's own pixels (every engine); 'backdrop' uses backdrop-filter: url() (Chromium only). */
  mode?: 'content' | 'backdrop';
  /** Lens follows the target's own size. */
  fit?: boolean;
  /** Clip the target to the lens shape. */
  clip?: boolean;
  /** backdrop-filter used by mode 'backdrop' outside Chromium. */
  fallback?: string;
  /** Apply updates immediately instead of on the next animation frame. */
  sync?: boolean;
  /** No lens at all; toggle with update({ hidden }). */
  hidden?: boolean;
}

export interface Glass {
  update(next?: GlassOptions & { hidden?: boolean }): void;
  flush(): void;
  readonly params: Required<GlassOptions>;
  readonly filterId: string;
  destroy(): void;
}

export interface Spring {
  set(next: number, options?: { immediate?: boolean }): void;
  readonly value: number;
  readonly target: number;
  stop(): void;
}

export interface LensMap {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  scale: number;
}

export const DEFAULTS: Readonly<Required<GlassOptions>>;
export const engine: 'blink' | 'webkit' | 'gecko' | 'unknown';
export const reducedMotion: MediaQueryList | { matches: boolean };
export function createGlass(target: HTMLElement, options?: CreateGlassOptions): Glass;
export function renderLensMap(options?: GlassOptions, scale?: number): LensMap;
export function createSpring(
  initial: number,
  onUpdate: (value: number, velocity: number) => void,
  options?: { stiffness?: number; damping?: number; mass?: number },
): Spring;
