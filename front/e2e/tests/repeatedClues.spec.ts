import { test, expect, type Browser, type Page } from '@playwright/test';

test.setTimeout(60000);

async function join(browser: Browser, name: string, room: string) {
	const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
	await context.addInitScript((username) => {
		localStorage.setItem('username', username);
		localStorage.setItem('howToPlayExpanded', 'false');
	}, name);
	const page = await context.newPage();
	await page.goto('http://localhost:5173');
	await page.getByPlaceholder('Enter Room Name').fill(room);
	await page.getByRole('button', { name: 'Join', exact: true }).click();
	await expect(page.getByTestId('roomHeader-username')).toHaveText(name);
	return { page, context, name };
}

const clueRow = (page: Page, clue: string) =>
	page.getByRole('listitem').filter({ has: page.getByText(clue, { exact: true }) });

test('a majority of writers marking a clue as repeated hides it from the guesser', async ({
	browser
}, info) => {
	const room = `RC${Date.now().toString().slice(-8)}`;
	const players = [];
	try {
		for (const name of ['Alice', 'Bob', 'Charlie']) players.push(await join(browser, name, room));
		await players[0].page.getByRole('button', { name: 'Start Game', exact: true }).click();

		let guesser;
		const writers = [];
		for (const player of players) {
			const select = player.page.getByRole('button', { name: 'Select Difficulty', exact: true });
			await expect(player.page.getByText('My role is', { exact: false })).toBeVisible();
			if (await select.count()) guesser = player;
			else writers.push(player);
		}
		if (!guesser) throw new Error('No guesser assigned');
		await guesser.page.getByRole('button', { name: 'Select Difficulty', exact: true }).click();

		for (const [writer, clue] of [
			[writers[0], 'hop'],
			[writers[1], 'hopping']
		] as const) {
			await writer.page.getByPlaceholder('Enter a one word clue...').fill(clue);
			await writer.page.getByRole('button', { name: 'Submit Clue', exact: true }).click();
		}

		const [first, second] = writers;
		await expect(first.page.getByRole('heading', { name: 'Mark repeated clues' })).toBeVisible();
		await expect(first.page.getByText('Decided by majority vote.')).toBeVisible();

		await clueRow(first.page, 'hop').getByRole('button').click();
		await expect(clueRow(first.page, 'hop')).toContainText('✓ Marked');
		await expect(clueRow(second.page, 'hop')).toContainText('1 vote');
		await expect(clueRow(second.page, 'hop')).toContainText('1 vote short of majority');
		await expect(clueRow(second.page, 'hop')).not.toContainText('Repeated');

		await clueRow(second.page, 'hop').getByRole('button').click();
		await expect(clueRow(first.page, 'hop')).toContainText('Repeated');
		await expect(first.page.getByText(`${guesser.name} will see`)).toContainText('1 clue');
		await first.page.screenshot({ path: info.outputPath('repeated-majority.png'), fullPage: true });

		await first.page.getByRole('button', { name: 'Done', exact: true }).click();
		await expect(
			first.page.getByRole('button', { name: /Waiting for the other writers · 1 of 2 done/ })
		).toBeVisible();
		await second.page.getByRole('button', { name: 'Done', exact: true }).click();

		await expect(guesser.page.getByPlaceholder('Enter your guess...')).toBeVisible();
		await expect(guesser.page.getByText('<redacted>', { exact: true })).toHaveCount(1);
		await expect(guesser.page.getByText('hopping', { exact: true })).toBeVisible();
	} finally {
		for (const player of players) await player.context.close();
	}
});
