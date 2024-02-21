module.exports = {
  collectCoverage: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  verbose: true,
  transform: {
    '^.+\\.raw$': 'jest-text-transformer',
  },
}
