module.exports = {
  collectCoverage: true,
  coveragePathIgnorePatterns: ['^.*/test/.*.raw'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  verbose: true,
  transform: {
    '^.+\\.raw$': 'jest-text-transformer',
  },
}
