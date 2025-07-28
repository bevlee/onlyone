import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

/// <reference types="vitest/config" />
export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), svelteTesting()],
	resolve: { 
		alias: { $lib: path.resolve('./src/lib') }
	},
	server: {
		https: fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem') ? {
			key: fs.readFileSync('./localhost-key.pem'),
			cert: fs.readFileSync('./localhost.pem')
		} : undefined,
		// http2: false, // Disable HTTP/2
		proxy: {}
	},
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'jsdom',
					globals: true,
					include: [
						'src/lib/components/**/*.{test,spec}.{js,ts}',
						'src/lib/components/**/*.{test,spec}.svelte.{js,ts}',
						'src/lib/utils/**/*.{test,spec}.{js,ts}'
					],
					exclude: ['src/tests/*.i{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-unit.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/tests/*.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			}
		],
		coverage: {
			provider: 'v8'
		},
	}
});
