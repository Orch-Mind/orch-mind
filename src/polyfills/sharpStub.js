// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// src/polyfills/sharpStub.js
// Minimal stub for the "sharp" native module so that bundlers/electron can resolve it
// without trying to include the native binary. Any runtime call will explicitly throw
// an error, signalling that image manipulation is not available in this environment.

function unsupported() {
  throw new Error(
    "The 'sharp' module is not available in this environment. If you need image processing, " +
      "run the code in a Node.js environment with the native sharp binary installed."
  );
}

const sharpProxy = new Proxy(unsupported, {
  get() {
    return unsupported;
  },
  apply() {
    return unsupported();
  },
});

export default sharpProxy;
module.exports = sharpProxy;
