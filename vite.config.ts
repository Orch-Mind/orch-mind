// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import path from "node:path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// Plugin to clean HTML for Electron (remove CSP meta tags that could conflict)
function cleanHtmlPlugin() {
  return {
    name: 'clean-html',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string, context: any) {
        // Remove any CSP meta tags from the HTML before serving to Electron
        return html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
      }
    }
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    cleanHtmlPlugin(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            sourcemap: mode === 'development',
            minify: mode === 'production',
            outDir: "dist-electron",
            rollupOptions: {
              external: [
                "electron",
                // DuckDB native modules - must be external for main process
                "@duckdb/node-api",
                "@duckdb/node-bindings",
                "@duckdb/node-bindings-darwin-arm64",
                "@duckdb/node-bindings-darwin-x64",
                "@duckdb/node-bindings-linux-arm64",
                "@duckdb/node-bindings-linux-x64",
                "@duckdb/node-bindings-win32-x64",
                /^@duckdb\/node-bindings/,
                /\.node$/,
                // HuggingFace transformers should not be bundled in main process
                "@huggingface/transformers",
                "onnxruntime-web",
                "onnxruntime-node"
              ],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "electron/preload/index.ts"),
        vite: {
          build: {
            sourcemap: mode === 'development' ? 'inline' : false,
            minify: mode === 'production',
            outDir: "dist-electron",
            rollupOptions: {
              external: [
                "electron",
                // DuckDB native modules - must be external
                "@duckdb/node-api",
                "@duckdb/node-bindings",
                /^@duckdb\/node-bindings/,
                /\.node$/,
                // Node.js built-in modules that should not be bundled in preload
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
                "zlib"
              ],
            },
          },
        },
      },
      renderer: {},
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Node.js polyfills for browser compatibility (renderer only)
      "worker_threads": path.resolve(__dirname, "src/polyfills/worker_threads.js"),
      "events": "events",
      "util": "util", 
      "stream": "stream-browserify",
      "buffer": "buffer",
      "process": "process/browser",
      "path": "path-browserify",
      "crypto": "crypto-browserify",
    },
  },
  server: {
    host: "localhost",
    port: 54321,
    fs: {
      allow: ['..']
    },
    headers: {
      // Ensure proper WASM serving headers for dev server
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      // Additional headers for DuckDB-WASM
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    // Enhanced connection stability for Electron
    hmr: {
      port: 54322,
      host: 'localhost'
    },
    // Improve connection reliability
    strictPort: false,
    force: true,
    clearScreen: false
  },
  build: {
    sourcemap: mode === 'development' ? 'inline' : false,
    rollupOptions: {
      external: [
        // External Node.js modules for Electron main process
        'electron',
        'fs',
        'path',
        'os',
        'stubborn-fs',
        'conf',
        // DuckDB native modules
        '@duckdb/node-api',
        '@duckdb/node-bindings',
        /^@duckdb\/node-bindings/,
        /\.node$/
      ],
      output: {
        format: 'es',
        // Ensure WASM files are handled correctly
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'wasm/[name].[ext]';
          }
          if (assetInfo.name?.includes('duckdb')) {
            return 'duckdb/[name].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    // Copy WASM files to dist
    assetsInlineLimit: 0, // Don't inline WASM files
    commonjsOptions: {
      // Exclude DuckDB native bindings from CommonJS processing
      exclude: [
        /^@duckdb\/node-bindings/,
        /\.node$/
      ]
    }
  },
  esbuild: {
    supported: {
      'top-level-await': true
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@huggingface/transformers",
      "onnxruntime-web",
      // Node.js polyfills
      "events",
      "util",
      "stream-browserify", 
      "buffer",
      "process/browser"
    ],
    exclude: [
      '@duckdb/duckdb-wasm', // Exclude from optimization to avoid bundling issues
      '@duckdb/node-api', // Exclude DuckDB native modules
      '@duckdb/node-bindings',
      'stubborn-fs',
      'conf',
      'electron'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
    // Disable Node.js modules not available in browser
    'process.versions.node': 'undefined',
  },
}));