/**
 * Jest Setup File
 * Configuración global para todos los tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Silenciar logs en tests

// Mock console para reducir ruido
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers
jest.useFakeTimers();

// Timeout para todos los tests
jest.setTimeout(10000);

// Limpiar después de cada test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global setup
beforeAll(() => {
  // Ejecutar antes de todos los tests
});

// Global teardown
afterAll(() => {
  // Limpiar después de todos los tests
  jest.useRealTimers();
});
