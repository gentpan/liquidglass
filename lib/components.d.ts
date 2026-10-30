
export { createGlass, createSpring, renderLensMap, engine, DEFAULTS } from './liquid-glass.js';
export type { GlassOptions, CreateGlassOptions, Glass, Spring, LensMap } from './liquid-glass.js';

export interface ToastOptions {
  /** 'check' | 'info' | 'alert' | 'bell', trusted SVG markup, or null for none. */
  icon?: 'check' | 'info' | 'alert' | 'bell' | (string & {}) | null;
  /** Milliseconds before it leaves; 0 keeps it. */
  duration?: number;
  container?: HTMLElement;
  tone?: 'light';
  /** CSS selector of the backdrop to refract. */
  backdrop?: string;
}

export function toast(message: string, options?: ToastOptions): { close(): void; element: LgToast };

export class LgSwitch extends HTMLElement {
  checked: boolean;
}
export class LgSlider extends HTMLElement {
  value: number;
}
export class LgSegmented extends HTMLElement {
  value: string | null;
  /** Re-sync the glass copy after changing option labels. */
  refresh(): void;
}
export class LgButton extends HTMLElement {}
export class LgPanel extends HTMLElement {}
export class LgNavbar extends HTMLElement {
  setCurrent(index: number): void;
  /** Re-sync the glass copy after changing link text. */
  refresh(): void;
}
export class LgMenubar extends HTMLElement {}
export class LgMenu extends HTMLElement {
  readonly open: boolean;
  show(): void;
  close(): void;
}
export class LgToast extends HTMLElement {}
export class LgDock extends HTMLElement {}
export class LgLens extends HTMLElement {
  configure(next: Partial<{ width: number; height: number; radius: number }> & Record<string, unknown>): void;
  moveTo(x: number, y: number): void;
}
export class Surface {
  constructor(host: HTMLElement, options?: object);
  attach(): void;
  detach(): void;
  update(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'lg-switch': LgSwitch;
    'lg-slider': LgSlider;
    'lg-segmented': LgSegmented;
    'lg-button': LgButton;
    'lg-panel': LgPanel;
    'lg-navbar': LgNavbar;
    'lg-menubar': LgMenubar;
    'lg-menu': LgMenu;
    'lg-toast': LgToast;
    'lg-dock': LgDock;
    'lg-lens': LgLens;
  }
  interface HTMLElementEventMap {
    select: CustomEvent<{ item: HTMLButtonElement; value: string }>;
  }
}
