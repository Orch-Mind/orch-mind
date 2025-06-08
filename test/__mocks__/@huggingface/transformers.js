// Mock for @huggingface/transformers
module.exports = {
  pipeline: jest.fn(),
  AutoTokenizer: {
    from_pretrained: jest.fn(),
  },
};
