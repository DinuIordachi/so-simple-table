import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [
		vue(),
		dts({
			tsconfigPath: './tsconfig.build.json',
			rollupTypes: false,
			copyDtsFiles: false,
			insertTypesEntry: true,
			// vite-plugin-dts can resolve the workspace `@sst/core` to its built path
			// (e.g. in the SFC's expose() block), leaking a non-portable monorepo path
			// into the shipped declarations. Rewrite those back to the bare specifier.
			beforeWriteFile: (filePath, content) => ({
				filePath,
				content: content.replace(/packages\/core\/(?:dist|src)(?:\/index(?:\.d\.ts)?)?/g, '@sst/core'),
			}),
		}),
	],
	build: {
		lib: {
			entry: {
				index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
				primevue: fileURLToPath(new URL('./src/primevue/index.ts', import.meta.url)),
			},
			formats: ['es', 'cjs'],
			fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
		},
		rollupOptions: {
			external: (id) =>
				id === 'vue' ||
				id === '@sst/core' ||
				id === 'primevue' ||
				id.startsWith('primevue/') ||
				id.startsWith('@primevue/'),
			output: {
				globals: { vue: 'Vue', '@sst/core': 'SstCore' },
				assetFileNames: (assetInfo) =>
					assetInfo.name === 'style.css' ? 'style.css' : (assetInfo.name ?? 'asset'),
			},
		},
		sourcemap: true,
		cssCodeSplit: false,
	},
});
