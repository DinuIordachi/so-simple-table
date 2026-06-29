import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: { '@bridgebyte/sst-core': new URL('../core/src/index.ts', import.meta.url).pathname },
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,tsx}'],
			exclude: ['src/**/*.test.{ts,tsx}', 'src/index.ts'],
		},
	},
});
