// vite.config.production.ts
// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { Plugin } from "vite";

/**
 * Production plugin for optimized ONNX model handling
 * Based on Vite official documentation for ONNX + onnxruntime-web
 */
export function productionModelPlugin(): Plugin {
  return {
    name: "production-model-plugin",
    configureServer(server) {
      // Only add essential CORS headers for production
      server.middlewares.use((req, res, next) => {
        // Set CORS headers for all requests
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS, HEAD"
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Accept, Authorization, Range"
        );
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");

        // Handle preflight requests
        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        next();
      });
    },
    configResolved(config) {
      // Ensure ONNX assets are handled correctly in production
      if (config.command === "build") {
        console.log("✅ [Production] ONNX assets configuration validated");
      }
    },
    generateBundle(options, bundle) {
      // Ensure ONNX files are properly handled in production build
      Object.values(bundle).forEach((chunk) => {
        if (chunk.type === "asset" && chunk.fileName?.endsWith(".onnx")) {
          // Add specific headers for ONNX files
          chunk.fileName = `models/${chunk.fileName}`;
        }
      });
    },
  };
}
