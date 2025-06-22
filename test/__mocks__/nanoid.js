// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Mock for nanoid
const nanoid = jest.fn(() => "mocked-nanoid-id");

module.exports = {
  nanoid,
};
