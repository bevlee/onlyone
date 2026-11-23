import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: undefined,
    reporter: 'html',
    use: {
        // We'll let the baseURL be determined by the webServer
        trace: 'on-first-retry',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },
    webServer: [
        {
            command: 'npm start',
            cwd: '../../gameserver',
            env: {
                ORIGINAL_WORDS_ADMIN_PASSWORD: 'test-editor-password',
                ORIGINAL_WORDS_PATH: join(tmpdir(), `onlyone-editor-e2e-${randomUUID()}.json`),
            },
            port: 3000,
            reuseExistingServer: true,
            stdout: 'pipe',
            stderr: 'pipe',
        },
        {
            command: 'npm run build && npm run dev',
            port: 5173,
            reuseExistingServer: true,
            stdout: 'pipe',
            stderr: 'pipe',
        },
    ],
}); 