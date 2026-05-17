const { success, error } = require('../src/utils/response');

describe('Response Utils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test('success() should send correct response with default status', () => {
    success(mockRes, { foo: 'bar' });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: { foo: 'bar' },
      timestamp: expect.any(String),
    });
  });

  test('success() should send correct response with custom status', () => {
    success(mockRes, { foo: 'bar' }, 201);
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  test('error() should send correct error with default status', () => {
    error(mockRes, 'Something went wrong');
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Something went wrong',
      timestamp: expect.any(String),
    });
  });

  test('error() should send correct error with custom status', () => {
    error(mockRes, 'Bad request', 400);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
