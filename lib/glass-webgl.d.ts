import type { GlassOptions } from './liquid-glass.js';

export interface GlassRenderer {
  /** Replace all lenses. */
  setLenses(list: GlassOptions[]): void;
  /** Move or reshape one lens. */
  updateLens(index: number, next: GlassOptions): void;
  render(): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

export function createGlassRenderer(
  canvas: HTMLCanvasElement,
  source: TexImageSource,
  options?: { pixelRatio?: number },
): GlassRenderer;
