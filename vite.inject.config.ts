import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/injected/darkmode-inject.ts"),
      name: "OrblyDarkMode",
      formats: ["iife"],
      fileName: () => "darkmode-inject.js",
    },
    outDir: "src-tauri/resources",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
