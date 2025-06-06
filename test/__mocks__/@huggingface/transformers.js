// Mock for @huggingface/transformers
const pipeline = jest.fn(() => ({
  encode: jest.fn(() => [1, 2, 3]),
  decode: jest.fn(() => "mocked text"),
}));

module.exports = {
  pipeline,
}; 