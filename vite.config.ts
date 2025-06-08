// vite.config.ts
// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import path from "node:path";
import serveStatic from "serve-static";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// Plugin para remover meta-CSP do index.html gerado pela Vite
function cleanHtmlPlugin() {
  return {
    name: "clean-html",
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string) {
        return html.replace(
          /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
          ""
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  // porta fixa
  process.env.VITE_PORT = "54321";
  process.env.VITE_HMR_PORT = "54321";

  return {
    publicDir: "public",
    assetsInclude: ["**/*.onnx", "**/*.onnx_data"],

    plugins: [
      cleanHtmlPlugin(),
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
                  "onnxruntime-node",
                ],
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
          },
        },
        renderer: {},
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
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
      },
    },

    // SERVE MODE: monte BEFORE o fallback da SPA
    configureServer(server) {
      // 1) sirva /models a partir de public/models
      server.middlewares.use(
        "/models",
        serveStatic(path.resolve(__dirname, "public/models"), {
          index: false,
          extensions: ["onnx", "onnx_data"],
        })
      );

      // 2) Proxy for HuggingFace requests to avoid CORS issues
      server.middlewares.use("/huggingface", (req, res, next) => {
        const url = req.url?.replace("/huggingface", "");
        const target = `https://huggingface.co${url}`;

        // Set CORS headers for HuggingFace proxy
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS, HEAD"
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Accept, Authorization"
        );
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        next();
      });

      // 3) depois deixe a Vite cuidar do restante (HTML, etc)
    },

    server: {
      host: "localhost",
      port: 54321,
      strictPort: true,
      fs: {
        allow: ["..", path.resolve(__dirname, "public/models")],
      },
      proxy: {
        // Proxy HuggingFace requests to avoid CORS issues
        "/api/huggingface": {
          target: "https://huggingface.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/huggingface/, ""),
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("Proxy error:", err);
            });
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              console.log("Proxying:", req.method, req.url);
              // Add proper headers for HuggingFace requests
              proxyReq.setHeader(
                "User-Agent",
                "Mozilla/5.0 (compatible; transformers.js)"
              );
              proxyReq.setHeader("Accept", "application/json, text/plain, */*");
            });
          },
        },
        // Proxy for HuggingFace CDN requests
        "/api/hf-cdn": {
          target: "https://cdn-lfs.huggingface.co",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hf-cdn/, ""),
          configure: (proxy, _options) => {
            proxy.on("proxyReq", (proxyReq, req, _res) => {
              proxyReq.setHeader(
                "User-Agent",
                "Mozilla/5.0 (compatible; transformers.js)"
              );
            });
          },
        },
      },
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
        "Access-Control-Allow-Headers":
          "Content-Type, Accept, Authorization, X-Requested-With, Range",
        "Access-Control-Allow-Credentials": "true",
        "Referrer-Policy": "no-referrer-when-downgrade",
        // Additional headers for better HuggingFace model loading
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Permissions-Policy": "interest-cohort=()",
        // Enable SharedArrayBuffer for better WASM performance
        "Document-Policy": "js-profiling",
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
          assetFileNames: (assetInfo) => {
            if (
              assetInfo.name?.endsWith(".onnx") ||
              assetInfo.name?.endsWith(".onnx_data")
            ) {
              return "models/[name][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
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
        "@huggingface/transformers",
        "onnxruntime-web",
        "onnxruntime-common",
        "events",
        "util",
        "stream-browserify",
        "buffer",
        "process/browser",
      ],
      exclude: [
        "@duckdb/duckdb-wasm",
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
    },
  };
});
