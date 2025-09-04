require('@testing-library/jest-dom');
require('whatwg-fetch');

// Polyfill for Next.js API routes in Jest
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js functions that require request context
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'mock-token' })),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(() => 'mock-header'),
  })),
}));

// Mock NextResponse.json properly
const mockJson = jest.fn((data, init) => ({
  json: () => Promise.resolve(data),
  status: init?.status || 200,
}));

jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: mockJson,
  },
}));