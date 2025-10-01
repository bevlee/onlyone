// import { defineConfig, devices } from '@playwright/test';

// export default defineConfig({
//     testDir: './tests',
//     fullyParallel: true,
//     forbidOnly: !!process.env.CI,
//     retries: 0,
//     workers: undefined,
//     reporter: 'html',
//     use: {
//         // We'll let the baseURL be determined by the webServer
//         trace: 'on-first-retry',
//         video: 'retain-on-failure',
//         screenshot: 'only-on-failure'
//     },
//     webServer: {
//         command: 'npm run build && npm run dev',
//         port: 5173,
//         reuseExistingServer: true,
//         stdout: 'pipe',
//         stderr: 'pipe',
//     },
// }); 