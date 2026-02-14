import { createEffect } from "solid-js";
import { theme } from "../stores/uiStore";

let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

function applyDarkClass(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function initThemeManager() {
  createEffect(() => {
    const current = theme();

    // Clean up previous media listener
    if (mediaQuery && mediaListener) {
      mediaQuery.removeEventListener("change", mediaListener);
      mediaListener = null;
    }

    if (current === "dark") {
      applyDarkClass(true);
    } else if (current === "light") {
      applyDarkClass(false);
    } else {
      // system
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyDarkClass(mediaQuery.matches);
      mediaListener = (e: MediaQueryListEvent) => applyDarkClass(e.matches);
      mediaQuery.addEventListener("change", mediaListener);
    }
  });
}
