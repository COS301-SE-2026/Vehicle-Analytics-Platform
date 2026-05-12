const { success, error } = require('../src/utils/response');

describe('Response Utils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test('success should return correct response structure', () => {
    const data = { test: 'value' };
    success(mockRes, data, 201);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
  });

  test('success should use default status 200', () => {
    const data = { test: 'value' };
    success(mockRes, data);
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test('error should return correct error structure', () => {
    error(mockRes, 'Test error', 400);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalled();
  });

  test('error should use default status 500', () => {
    error(mockRes, 'Test error');
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
