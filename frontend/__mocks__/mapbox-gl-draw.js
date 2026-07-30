
module.exports = jest.fn().mockImplementation(() => ({
    onAdd: jest(() => document.createElement('div')),
    onRemove: jest.fn(),
    getAll: jest.fn(() => ({ features: []})),
    add: jest.fn(),
    deleteAll: jest.fn(),
}))