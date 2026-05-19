const { TextEncoder, TextDecoder } = require('node:util');
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;