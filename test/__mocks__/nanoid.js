// Mock for nanoid
const nanoid = jest.fn(() => 'mocked-nanoid-id');

module.exports = {
  nanoid,
}; 