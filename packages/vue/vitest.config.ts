import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: { '@bridgebyte/sst-core': new URL('../core/src/index.ts', import.meta.url).pathname },
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.{ts,vue}'],
			exclude: ['src/**/*.test.ts', 'src/index.ts'],
		},
	},
});
