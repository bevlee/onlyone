import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: { alias: { $lib: path.resolve('./src/lib') } },
	server: {
		https: {
			key: fs.readFileSync('./localhost-key.pem'),
			cert: fs.readFileSync('./localhost.pem')
		},
		http2: false, // Disable HTTP/2
		proxy: {}
	}
});
