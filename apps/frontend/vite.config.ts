import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	resolve: { alias: { $lib: path.resolve('./src/lib') } },
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			},
			'/auth': {
				target: 'http://localhost:3000',
				changeOrigin: true
			},
			'/lobby': {
				target: 'http://localhost:3000',
				changeOrigin: true
			},
			'/health': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	}
});
