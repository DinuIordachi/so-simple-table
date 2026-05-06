import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [
		vue(),
		dts({
			tsconfigPath: './tsconfig.build.json',
			rollupTypes: true,
			copyDtsFiles: false,
		}),
	],
	build: {
		lib: {
			entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
			name: 'SstVue',
			formats: ['es', 'cjs'],
			fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
		},
		rollupOptions: {
			external: ['vue', '@sst/core'],
			output: {
				globals: { vue: 'Vue', '@sst/core': 'SstCore' },
				assetFileNames: (assetInfo) => (assetInfo.name === 'style.css' ? 'style.css' : assetInfo.name ?? 'asset'),
			},
		},
		sourcemap: true,
		cssCodeSplit: false,
	},
});
