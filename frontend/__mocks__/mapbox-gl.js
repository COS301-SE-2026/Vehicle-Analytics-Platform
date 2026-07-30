
module.exports = {
  Map: jest.fn().mockImplementation(() => ({
    addControl: jest.fn(),
    remove: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'load') callback()
    }),
    addSource: jest.fn(),
    addLayer: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    getElement: jest.fn().mockReturnValue({ style: {} }),
  })),
  accessToken: '',
}