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
      // i18next expects a simple key/value map;
      // adjust to your exact structure if needed.
      const out = {};
      for (const ctx of Object.values(po.translations)) {
        for (const [key, val] of Object.entries(ctx)) {
          if (!key || key === "") continue;
          const msg = val.msgstr?.[0] ?? "";
          out[key] = msg;
        }
      }
      return {
        code: `export default ${JSON.stringify(out)};`,
        map: null,
      };
    },
  };
}

// Re-use your multiple entry points
const input = {
  app: path.resolve(__dirname, "assets/js/app.js"),
  cssbattle: path.resolve(__dirname, "assets/js/iframes/cssbattle/index.js"),
  landing: path.resolve(__dirname, "assets/js/landing.js"),
  external: path.resolve(__dirname, "assets/js/external.js"),
  // broadcast_editor: path.resolve(
  //   __dirname,
  //   "assets/js/widgets/pages/broadcast-editor/index.js",
  // ),
  // stream: path.resolve(
  //   __dirname,
  //   "assets/js/widgets/pages/broadcast-editor/stream.js",
  // ),
};

export default defineConfig(({ command, mode }) => ({
  define: {
    gon: "window.gon",
  },
  plugins: [
    react(),
    poLoader(),
    // makes process.env.* defined (stringified) if your code references it
    environment(["NODE_ENV"]),
  ],

  root: ".", // project root
  base: command === "serve" ? "/" : "/assets/",
  // keep the rest of your config

  // where Phoenix serves from in production:
  build: {
    outDir: "priv/static/assets",
    assetsDir: "", // keep flat (so your [name].css/js stay at /assets/)
    manifest: true, // needed for Phoenix helper
    sourcemap: mode === "development",
    rollupOptions: {
      input,
      // (optional) put monaco in a separate chunk
      output: {
        manualChunks: { monaco: ["monaco-editor"] },
      },
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

  // Vite dev server (replaces webpack-dev-server on :8080)
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    cors: true,
    hmr: { host: "localhost", protocol: "ws" },
  },

  resolve: {
    alias: {
      // keep your Webpack aliases
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

      // your old ProvidePlugin fallbacks
      path: "path-browserify",
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },

  // Copy static assets like CopyWebpackPlugin:
  // Place files in ./assets/static — Vite copies that to outDir at build.
  publicDir: "assets/static",
}));
