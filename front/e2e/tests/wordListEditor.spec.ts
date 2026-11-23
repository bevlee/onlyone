import { test, expect } from '@playwright/test';

test('word editor: unlock, difficulties, add, remove and session expiry', async ({
	page
}, info) => {
	await page.goto('http://localhost:5173/words');
	await expect(page.getByRole('heading', { name: 'Word list editor' })).toBeVisible();
	await page.getByLabel('Password', { exact: true }).fill('wrong');
	await page.getByRole('button', { name: 'Unlock', exact: true }).click();
	await expect(page.getByRole('alert')).toHaveText('Incorrect password.');
	await page.screenshot({ path: info.outputPath('00-unlock.png'), fullPage: true });
	await page.getByLabel('Password', { exact: true }).fill('test-editor-password');
	await page.getByRole('button', { name: 'Unlock', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Original words' })).toBeVisible();
	await expect(page.getByRole('list', { name: 'easy secret words' })).toBeVisible();
	await page.screenshot({ path: info.outputPath('01-editor.png'), fullPage: true });
	for (const difficulty of ['Medium', 'Hard', 'Easy']) {
		await page.getByRole('button', { name: difficulty, exact: true }).click();
		await expect(
			page.getByRole('list', { name: `${difficulty.toLowerCase()} secret words` })
		).toBeVisible();
	}
	await page.getByLabel('Add a secret word').fill('Editor test phrase');
	await page.getByRole('button', { name: 'Add', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Remove Editor test phrase', exact: true })
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole('button', { name: 'Remove Editor test phrase', exact: true })
	).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: info.outputPath('02-mobile.png'), fullPage: true });
	await page.getByRole('button', { name: 'Remove Editor test phrase', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Remove Editor test phrase', exact: true })
	).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
	await page.context().clearCookies();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Unlock', exact: true })).toBeVisible();
	const response = await page.request.get('http://localhost:5173/api/original-words/easy', {
		headers: { 'X-Word-List-Editor': '1' }
	});
	expect(response.status()).toBe(401);
});
