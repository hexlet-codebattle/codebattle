import { mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.js";

// Stub binary/asset imports to empty modules (mirrors the old jest-transform-stub
// moduleNameMapper). CSS is handled separately via `test.css: false`.
function stubAssets() {
  const RE = /\.(svg|png|jpe?g|gif|webp|ico|ttf|woff2?)$/;
  return {
    name: "test-stub-assets",
    enforce: "pre",
    load(id) {
      if (RE.test(id.split("?")[0])) return "export default {};";
      return null;
    },
  };
}

const baseConfig = viteConfig({ command: "serve", mode: "test" });

// `define: { gon: "window.gon" }` references `window`, which breaks Vitest's
// config evaluation in Node. Tests mock the `gon` module directly instead.
delete baseConfig.define;

// Drop dev-server / prod-only plugins that are irrelevant (and noisy) under test:
// full-reload has no meaning, and the font copiers write to priv/static on every worker.
const DROP_PLUGINS = new Set(["force-full-reload", "copy-codicon-font", "copy-katex-fonts"]);
baseConfig.plugins = baseConfig.plugins
  .flat(Infinity)
  .filter((p) => !p || !DROP_PLUGINS.has(p.name));

export default mergeConfig(baseConfig, {
  plugins: [stubAssets()],
  test: {
    globals: true,
    environment: "jsdom",
    // Match the old jsdom default (port-less localhost) that tests build URLs against.
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: ["./vitest.setup.js"],
    css: false,
    include: ["assets/js/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/helpers/**", "**/__fixtures__/**"],
    // In tests `monaco-editor` resolves to the react wrapper, as it did under jest.
    alias: {
      "monaco-editor": "@monaco-editor/react",
    },
  },
});
