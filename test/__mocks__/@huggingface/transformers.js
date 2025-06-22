// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Mock for @huggingface/transformers
module.exports = {
  pipeline: jest.fn(),
  AutoTokenizer: {
    from_pretrained: jest.fn(),
  },
};
