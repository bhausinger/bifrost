import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
});

// Clean up after all tests
afterAll(() => {
  // Cleanup if needed
});

// Setup before each test
beforeEach(() => {
  // Reset any mocks or state
});

// Cleanup after each test
afterEach(() => {
  // Reset any test state
});