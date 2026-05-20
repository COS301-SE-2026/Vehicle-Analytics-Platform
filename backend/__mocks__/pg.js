const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

module.exports = {
  Pool: jest.fn(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  })),
  mockQuery,
};
