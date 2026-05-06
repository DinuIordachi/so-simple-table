import type { Config } from 'jest';

const config: Config = {
	preset: 'jest-preset-angular',
	setupFilesAfterEach: ['<rootDir>/setup-jest.ts'],
	rootDir: '.',
	testMatch: ['<rootDir>/src/**/*.spec.ts'],
	moduleNameMapper: { '^@sst/core$': '<rootDir>/../core/src/index.ts' },
	transform: {
		'^.+\\.(ts|mjs|js|html)$': [
			'jest-preset-angular',
			{
				tsconfig: '<rootDir>/tsconfig.spec.json',
				stringifyContentPathRegex: '\\.html$',
			},
		],
	},
	transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};

export default config;
