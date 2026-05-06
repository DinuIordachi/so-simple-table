import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	clean: true,
	target: 'es2022',
	tsconfig: './tsconfig.build.json',
	splitting: false,
	treeshake: true,
	onSuccess: async () => {
		copyFileSync('src/style.css', 'dist/style.css');
	},
});
