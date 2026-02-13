// This file is built separately into a self-contained IIFE
// that gets injected into app webviews for dark mode support.
import { enable, disable, auto, isEnabled, exportGeneratedCSS } from 'darkreader';

interface DarkModeConfig {
  mode: 'dynamic' | 'filter' | 'static' | 'off';
  brightness: number;
  contrast: number;
  sepia: number;
  bgColor: string;
  textColor: string;
  customCss: string;
}

(window as any).__ORBLY_DARK_MODE__ = {
  apply(config: DarkModeConfig) {
    // Always reset first
    disable();
    const staticEl = document.getElementById('__orbly_dark_static__');
    if (staticEl) staticEl.remove();

    if (config.mode === 'off') return;

    if (config.mode === 'dynamic') {
      enable({
        brightness: config.brightness,
        contrast: config.contrast,
        sepia: config.sepia,
        ...(config.bgColor ? { darkSchemeBackgroundColor: config.bgColor } : {}),
        ...(config.textColor ? { darkSchemeTextColor: config.textColor } : {}),
      }, config.customCss ? { css: config.customCss } : undefined);
    } else if (config.mode === 'filter') {
      enable({
        mode: 0, // Filter mode (0 = filter, 1 = dynamic)
        brightness: config.brightness,
        contrast: config.contrast,
        sepia: config.sepia,
      }, config.customCss ? { css: config.customCss } : undefined);
    } else if (config.mode === 'static') {
      // Static = custom CSS only, no DarkReader analysis
      if (config.customCss) {
        const styleId = '__orbly_dark_static__';
        let el = document.getElementById(styleId);
        if (!el) {
          el = document.createElement('style');
          el.id = styleId;
          document.head.appendChild(el);
        }
        el.textContent = config.customCss;
      }
    }
  },

  disable() {
    disable();
    const staticEl = document.getElementById('__orbly_dark_static__');
    if (staticEl) staticEl.remove();
  },

  isEnabled() {
    return isEnabled();
  },
};
