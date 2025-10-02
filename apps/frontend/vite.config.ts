import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	resolve: { alias: { $lib: path.resolve('./src/lib') } },
	server: {
		proxy: {
			'/gameserver': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	}
});
