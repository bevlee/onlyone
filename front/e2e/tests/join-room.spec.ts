import { test, expect } from '@playwright/test';

test.describe('Join Room functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the homepage and wait for it to be ready
        await page.goto('http://localhost:5173');
        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');
    });

    test('should be able to join a room with a set username', async ({ page }) => {
        // Set up any required state (like username in localStorage)
        await page.evaluate(() => {
            localStorage.setItem('username', 'testUser');
        });

        // Reload page to apply localStorage changes
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Type room name
        const roomInput = page.getByRole('textbox');
        expect(await roomInput.inputValue()).toBe("");
        await roomInput.fill('TESTROOM12');

        // Find and click the join button
        const joinButton = await page.getByRole('button', { name: 'Join' });
        console.log('Waiting for join button...');
        await expect(joinButton).toBeVisible({ timeout: 10000 });
        console.log('Found join button, clicking...');
        await joinButton.click();

        // Check the room name is correct
        const roomCode = await page.getByTestId('roomHeader-roomCode').textContent();
        expect(roomCode).toBe('TESTROOM12');

        // Check the username is correct
        const roomHeaderUsername = await page.getByTestId('roomHeader-username').textContent();
        expect(roomHeaderUsername).toBe('testUser');
    });

    test('should generate random username if none exists', async ({ page }) => {
        // Clear any existing username
        await page.evaluate(() => {
            localStorage.removeItem('username');
        });

        // Reload page to apply localStorage changes
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Type room name
        const roomInput = await page.getByRole('textbox');
        expect(await roomInput.inputValue()).toBe("");
        await roomInput.fill('TESTROOM12');

        // Try to click join button
        const joinButton = await page.getByRole('button', { name: 'Join' });
        await expect(joinButton).toBeVisible({ timeout: 10000 });
        await joinButton.click();

        // Check the room name is correct
        const roomCode = await page.getByTestId('roomHeader-roomCode').textContent();
        expect(roomCode).toBe('TESTROOM12');

        // Check the username is correct
        const roomHeaderUsername = await page.getByTestId('roomHeader-username').textContent();
        expect(roomHeaderUsername).toContain('user');
    });

    test('should convert lowercase chars to uppercase', async ({ page }) => {
        // Type room name
        const roomInput = await page.getByRole('textbox');
        expect(await roomInput.inputValue()).toBe("");
        await roomInput.fill('abc123ef');

        // Try to click join button
        const joinButton = await page.getByRole('button', { name: 'Join' });
        await expect(joinButton).toBeVisible({ timeout: 10000 });
        await joinButton.click();

        // Check the room name is correct
        const roomCode = await page.getByTestId('roomHeader-roomCode').textContent();
        expect(roomCode).toBe('ABC123EF');
    });

    test('should dissallow non alphanumeric chars', async ({ page }) => {
        // Type room name
        const roomInput = await page.getByRole('textbox');
        expect(await roomInput.inputValue()).toBe("");
        await roomInput.fill('!@#$%^&*()__-+=/.,<>?":;\'[]{}\|\\`~');

        // Join button should be disabled as the input should be null
        const joinButton = await page.getByRole('button', { name: 'Join' });
        await expect(joinButton).toBeDisabled();
    });
}); 