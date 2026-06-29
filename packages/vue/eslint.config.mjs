// Flat config (ESLint 9). Lints the `@sst/vue` source: TypeScript + Vue SFCs.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default tseslint.config(
	{ ignores: ['dist/**', 'coverage/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	...vue.configs['flat/essential'],
	{
		files: ['**/*.vue'],
		languageOptions: {
			parserOptions: { parser: tseslint.parser },
		},
	},
	{
		// Generic SFCs use a single-letter type param; the Vue parser flags it as an
		// undefined component. Tests legitimately use throwaway casts.
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
);
