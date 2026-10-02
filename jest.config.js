module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
  ],
  testMatch: [
    '**/test/**/*.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.js',
  ],
  // Umbral = cobertura actual (no puede bajar). Subirlo a medida que se agreguen tests; meta: 60.
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 30,
      statements: 30,
    },
  },
  verbose: true,
  maxWorkers: '50%',
  testTimeout: 10000,
  bail: false,
  collectCoverage: false,
};
