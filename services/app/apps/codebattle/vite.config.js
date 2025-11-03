import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import environment from "vite-plugin-environment";
import path from "path";
import fs from "fs";
import gettextParser from "gettext-parser";

// --- tiny .po loader so your i18next-po-loader use keeps working
function poLoader() {
  return {
    name: "po-loader",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".po")) return null;
      const po = gettextParser.po.parse(code);
      const out = {};
      for (const ctx of Object.values(po.translations)) {
        for (const [key, val] of Object.entries(ctx)) {
          if (!key || key === "") continue;
          const msg = val.msgstr?.[0] ?? "";
          out[key] = msg;
        }
      }
      return { code: `export default ${JSON.stringify(out)};`, map: null };
    },
  };
}

// --- force a hard reload for every change (no module-level HMR)
function forceFullReload() {
  return {
    name: "force-full-reload",
    handleHotUpdate(ctx) {
      ctx.server.ws.send({ type: "full-reload" });
      return []; // prevent Vite from doing module HMR
    },
  };
}

// Re-use your multiple entry points
const input = {
  app: path.resolve(__dirname, "assets/js/app.js"),
  cssbattle: path.resolve(__dirname, "assets/js/iframes/cssbattle/index.js"),
  landing: path.resolve(__dirname, "assets/js/landing.js"),
  external: path.resolve(__dirname, "assets/js/external.js"),
  styles: path.resolve(__dirname, "assets/css/style.scss"),
  // broadcast_editor: path.resolve(__dirname, "assets/js/widgets/pages/broadcast-editor/index.js"),
  // stream: path.resolve(__dirname, "assets/js/widgets/pages/broadcast-editor/stream.js"),
};

export default defineConfig(({ command, mode }) => ({
  define: { gon: "window.gon" },

  css: {
    preprocessorOptions: {
      scss: {
        includePaths: [path.resolve(__dirname, "assets/css")],
        silenceDeprecations: ["mixed-decls"],
      },
    },
    modules: {
      localsConvention: "dashes",
      generateScopedName: "[local]_[hash:base64:4]",
    },
  },

  plugins: [
    react({ fastRefresh: false }), // no react-refresh preamble
    poLoader(),
    forceFullReload(), // always trigger full reload
    environment(["NODE_ENV"]),
  ],

  root: ".",
  base: command === "serve" ? "/" : "/assets/",

  build: {
    outDir: "priv/static/assets",
    assetsDir: "",
    manifest: true,
    sourcemap: mode === "development",
    rollupOptions: {
      input,
      output: { manualChunks: { monaco: ["monaco-editor"] } },
    },
    emptyOutDir: true,
  },

  optimizeDeps: {
    include: [
      "monaco-editor/esm/vs/editor/editor.worker",
      "monaco-editor/esm/vs/language/json/json.worker",
      "monaco-editor/esm/vs/language/css/css.worker",
      "monaco-editor/esm/vs/language/html/html.worker",
      "monaco-editor/esm/vs/language/typescript/ts.worker",
    ],
  },

  // Dev server
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    cors: true,
    // HMR must be enabled so the browser receives the "full-reload" message
    hmr: { host: "localhost", protocol: "ws", port: 8080 },
    // If developing inside Docker and file changes aren't detected, uncomment:
    // watch: { usePolling: true, interval: 100 },
  },

  resolve: {
    alias: {
      gon: path.resolve(__dirname, "assets/js/shims/gon.js"),
      "@/": path.resolve(__dirname, "assets/js/widgets"),
      "@/components": path.resolve(__dirname, "assets/js/widgets/components"),
      "@/lib": path.resolve(__dirname, "assets/js/widgets/lib"),
      "@/machines": path.resolve(__dirname, "assets/js/widgets/machines"),
      "@/middlewares": path.resolve(__dirname, "assets/js/widgets/middlewares"),
      "@/pages": path.resolve(__dirname, "assets/js/widgets/pages"),
      "@/config": path.resolve(__dirname, "assets/js/widgets/config"),
      "@/selectors": path.resolve(__dirname, "assets/js/widgets/selectors"),
      "@/slices": path.resolve(__dirname, "assets/js/widgets/slices"),
      "@/utils": path.resolve(__dirname, "assets/js/widgets/utils"),
      path: "path-browserify",
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },

  publicDir: "assets/static",
}));
