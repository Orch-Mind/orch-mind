// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-env node */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '**/src/**/*.test.ts',
    '**/src/**/*.spec.ts',
    '**/src/**/*.test.tsx',
    '**/src/**/*.spec.tsx',
    '**/src/**/*.e2e.test.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      useESM: true, 
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@huggingface/transformers|@dqbd/tiktoken|onnxruntime-web|onnxruntime-common|nanoid))',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.silence-console.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@huggingface/transformers$': '<rootDir>/test/__mocks__/@huggingface/transformers.js',
    '^nanoid$': '<rootDir>/test/__mocks__/nanoid.js',
  },
};
