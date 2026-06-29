import { defineConfig } from 'tsup';
import { copyFileSync, existsSync } from 'node:fs';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	sourcemap: true,
	clean: true,
	target: 'es2022',
	tsconfig: './tsconfig.build.json',
	external: ['react', 'react-dom', '@bridgebyte/sst-core'],
	splitting: false,
	treeshake: true,
	onSuccess: async () => {
		if (existsSync('src/styles.css')) {
			copyFileSync('src/styles.css', 'dist/styles.css');
		}
	},
});
