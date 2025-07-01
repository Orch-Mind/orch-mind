// vite.config.ts
// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// Desktop application - CSP managed in index.html

export default defineConfig(({ mode }) => {
  // porta fixa
  process.env.VITE_PORT = "54321";
  process.env.VITE_HMR_PORT = "54321";

  return {
    publicDir: "public",
    assetsInclude: ["**/*.bin", "**/*.safetensors"],

    plugins: [
      // React plugin with explicit JSX configuration
      react({
        jsxRuntime: "automatic",
        jsxImportSource: "react",
        babel: {
          plugins: [],
          presets: [],
        },
      }),
      // Desktop application - no custom CSP plugins needed
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            build: {
              sourcemap: mode === "development",
              minify: mode === "production",
              outDir: "dist-electron",
              rollupOptions: {
                external: [
                  "electron",
                  "@duckdb/node-api",
                  /^@duckdb\/node-bindings/,
                  /\.node$/,
                ],
              },
            },
            resolve: {
              alias: {
                sharp: path.resolve(__dirname, "src/polyfills/sharpStub.js"),
              },
            },
          },
        },
        preload: {
          input: path.join(__dirname, "electron/preload/index.ts"),
          vite: {
            build: {
              sourcemap: mode === "development" ? "inline" : false,
              minify: mode === "production",
              outDir: "dist-electron",
              rollupOptions: {
                external: [
                  "electron",
                  "@duckdb/node-api",
                  /^@duckdb\/node-bindings/,
                  /\.node$/,
                  "fs",
                  "path",
                  "os",
                  "crypto",
                  "worker_threads",
                  "child_process",
                  "cluster",
                  "dgram",
                  "dns",
                  "http",
                  "https",
                  "http2",
                  "net",
                  "repl",
                  "stream",
                  "tls",
                  "v8",
                  "zlib",
                ],
              },
            },
            resolve: {
              alias: {
                sharp: path.resolve(__dirname, "src/polyfills/sharpStub.js"),
              },
            },
          },
        },
        renderer: {},
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@services": path.resolve(__dirname, "src/services"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@types": path.resolve(__dirname, "src/types"),
        "@shared": path.resolve(__dirname, "src/shared"),
        worker_threads: path.resolve(
          __dirname,
          "src/polyfills/worker_threads.js"
        ),
        events: "events",
        util: "util",
        stream: "stream-browserify",
        buffer: "buffer",
        process: "process/browser",
        path: "path-browserify",
        crypto: "crypto-browserify",
        sharp: path.resolve(__dirname, "src/polyfills/sharpStub.js"),
      },
    },

    // Desktop application - no special model serving needed

    server: {
      host: "localhost",
      port: 54321,
      strictPort: true,
      fs: {
        allow: ["..", path.resolve(__dirname, "public/models")],
      },
      headers: {
        // Security headers for desktop app
        "Referrer-Policy": "no-referrer-when-downgrade",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Permissions-Policy": "interest-cohort=()",
      },
      hmr: {
        port: 54321,
        host: "localhost",
        clientPort: 54321,
        protocol: "ws",
        overlay: false,
        timeout: 30000,
      },
      force: true,
      clearScreen: false,
    },

    preview: {
      host: "localhost",
      port: 54321,
      strictPort: true,
    },

    build: {
      sourcemap: mode === "development" ? "inline" : false,
      rollupOptions: {
        external: [
          "electron",
          "fs",
          "path",
          "os",
          "conf",
          "@duckdb/node-api",
          "@duckdb/node-bindings",
          /^@duckdb\/node-bindings/,
          /\.node$/,
        ],
        output: {
          format: "es",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
      assetsInlineLimit: 0,
      commonjsOptions: {
        exclude: [/^@duckdb\/node-bindings/, /\.node$/],
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "events",
        "util",
        "stream-browserify",
        "buffer",
        "process/browser",
      ],
      exclude: [
        "@duckdb/node-api",
        "@duckdb/node-bindings",
        "conf",
        "electron",
      ],
      esbuildOptions: {
        define: { global: "globalThis" },
        plugins: [
          NodeGlobalsPolyfillPlugin({ process: true, buffer: true }),
          NodeModulesPolyfillPlugin(),
        ],
      },
    },

    define: {
      global: "globalThis",
      "process.env.NODE_ENV": JSON.stringify(
        mode === "development" ? "development" : "production"
      ),
      "process.versions.node": "undefined",
      // Ensure React is properly defined
      __DEV__: mode === "development",
    },

    // Ensure proper JSX handling in build
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
      jsxDev: mode === "development",
    },
  };
});
