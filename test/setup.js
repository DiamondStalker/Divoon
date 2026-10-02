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

// Sin fake timers globales: rompen los timeouts internos de Mongoose.
// Si un test los necesita, que llame jest.useFakeTimers() dentro de su propio describe.

// Timeout para todos los tests
jest.setTimeout(10000);

// Limpiar después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
