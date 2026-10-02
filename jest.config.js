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
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  verbose: true,
  maxWorkers: '50%',
  testTimeout: 10000,
  bail: false,
  collectCoverage: false,
};
