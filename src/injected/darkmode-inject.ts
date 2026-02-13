// This file is built separately into a self-contained IIFE
// that gets injected into app webviews for dark mode support.
import { enable, disable, isEnabled } from 'darkreader';

interface DarkModeConfig {
  mode: 'dynamic' | 'filter' | 'static' | 'off';
  brightness: number;
  contrast: number;
  sepia: number;
  bgColor: string;
  textColor: string;
  customCss: string;
}

const FILTER_STYLE_ID = '__orbly_dark_filter__';
const STATIC_STYLE_ID = '__orbly_dark_static__';

function removeElement(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function injectStyle(id: string, css: string) {
  removeElement(id);
  if (!css) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  (document.head || document.documentElement).appendChild(el);
}

function disableAll() {
  disable();
  removeElement(FILTER_STYLE_ID);
  removeElement(STATIC_STYLE_ID);
}

(window as any).__ORBLY_DARK_MODE__ = {
  apply(config: DarkModeConfig) {
    disableAll();

    if (config.mode === 'off') return;

    if (config.mode === 'dynamic') {
      // DarkReader's NPM API supports dynamic theme analysis
      enable({
        brightness: config.brightness,
        contrast: config.contrast,
        sepia: config.sepia,
        ...(config.bgColor ? { darkSchemeBackgroundColor: config.bgColor } : {}),
        ...(config.textColor ? { darkSchemeTextColor: config.textColor } : {}),
      });
    } else if (config.mode === 'filter') {
      // Pure CSS filter approach — fast, lower fidelity
      const b = config.brightness / 100;
      const c = config.contrast / 100;
      const s = config.sepia / 100;
      const css = `
html {
  filter: invert(1) hue-rotate(180deg) brightness(${b}) contrast(${c}) sepia(${s}) !important;
  background-color: #fff !important;
}
html img, html video, html canvas, html svg image,
html [style*="background-image"] {
  filter: invert(1) hue-rotate(180deg) !important;
}`;
      injectStyle(FILTER_STYLE_ID, css);
    } else if (config.mode === 'static') {
      // Static = per-service custom CSS overrides only
      if (config.customCss) {
        injectStyle(STATIC_STYLE_ID, config.customCss);
      }
    }
  },

  disable() {
    disableAll();
  },

  isEnabled() {
    return isEnabled();
  },
};
