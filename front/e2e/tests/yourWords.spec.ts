import { test, expect, type Browser, type Page, type TestInfo } from '@playwright/test';

test.setTimeout(60000);

async function join(browser: Browser, name: string, room: string, testInfo: TestInfo) {
	const context = await browser.newContext({
		viewport: { width: 1024, height: 900 },
		recordVideo: { dir: testInfo.outputPath('videos') }
	});
	await context.addInitScript((username) => {
		if (!localStorage.getItem('username')) localStorage.setItem('username', username);
		localStorage.setItem('howToPlayExpanded', 'false');
	}, name);
	const page = await context.newPage();
	const identities: string[] = [];
	const readIdentity = (payload: string) => {
		for (const packet of payload.split('\x1e')) {
			if (!packet.startsWith('42')) continue;
			const event: unknown = JSON.parse(packet.slice(2));
			if (Array.isArray(event) && event[0] === 'playerIdentity' && typeof event[1] === 'string')
				identities.push(event[1]);
		}
	};
	page.on('websocket', (websocket) =>
		websocket.on('framereceived', ({ payload }) => {
			if (typeof payload === 'string') readIdentity(payload);
		})
	);
	page.on('response', async (response) => {
		if (response.url().includes('/socket.io/') && response.request().method() === 'GET') {
			readIdentity(await response.text().catch(() => ''));
		}
	});
	await page.goto('http://localhost:5173');
	await page.getByPlaceholder('Enter Room Name').fill(room);
	await page.getByRole('button', { name: 'Join', exact: true }).click();
	await expect(page.getByTestId('roomHeader-username')).toHaveText(name);
	return { page, context, name, identities };
}

async function capture(page: Page, info: TestInfo, name: string) {
	await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

test('Your words: private submissions, duplicate ownership, complete pool and restart', async ({
	browser
}, info) => {
	const room = `YW${Date.now().toString().slice(-8)}`;
	const players = [];
	const errors: string[] = [];
	try {
		for (const name of ['Alice', 'Bob', 'Charlie']) {
			const player = await join(browser, name, room, info);
			player.page.on('pageerror', (error) => errors.push(error.message));
			players.push(player);
		}
		const host = players[0].page;
		await host.getByRole('radio', { name: /^Your words/ }).check();
		await capture(host, info, '01-mode');
		await host.getByRole('button', { name: 'Start Game', exact: true }).click();
		for (const player of players) {
			await expect(
				player.page.getByRole('heading', { name: 'Add your secret words' })
			).toBeVisible();
			await expect(
				player.page.getByRole('button', { name: 'Submit words', exact: true })
			).toBeDisabled();
		}
		await capture(host, info, '02-empty-submission');
		await host.getByLabel('Secret word 1').fill('Loki');
		await host.getByRole('button', { name: 'Submit words', exact: true }).click();
		await expect(host.getByRole('button', { name: 'Words submitted', exact: true })).toBeDisabled();
		await expect(players[1].page.getByLabel('Secret word 1')).toHaveValue('');
		await expect(players[1].page.getByText('1 / 3 players ready', { exact: true })).toBeVisible();
		await expect(players[1].page.getByText('Loki', { exact: true })).toHaveCount(0);
		await capture(host, info, '03-waiting');
		for (const [index, word] of [
			[1, 'LOKI'],
			[2, 'Shrek']
		] satisfies [number, string][]) {
			await players[index].page.getByLabel('Secret word 1').fill(word);
			await players[index].page.getByRole('button', { name: 'Submit words', exact: true }).click();
		}
		const seen = new Set<string>();
		for (let round = 0; round < 2; round++) {
			for (const player of players) {
				await expect(player.page.getByText('My role is', { exact: false })).toBeVisible();
				await expect(
					player.page.getByRole('heading', { name: 'Add your secret words' })
				).toHaveCount(0);
			}
			const writers = [];
			let guesser;
			for (const player of players) {
				if (
					await player.page.getByText('Everyone is busy writing clues for the secret word').count()
				)
					guesser = player;
				else writers.push(player);
			}
			if (!guesser) throw new Error('No guesser assigned');
			const word = await writers[0].page.locator('.text-primary.text-lg.font-semibold').innerText();
			expect(seen.has(word)).toBe(false);
			seen.add(word);
			if (word === 'Loki') expect(guesser.name).toBe('Charlie');
			else expect(['Alice', 'Bob']).toContain(guesser.name);
			await expect(guesser.page.getByText(word, { exact: true })).toHaveCount(0);
			await capture(guesser.page, info, `04-round-${round}-guesser`);
			await capture(writers[0].page, info, `05-round-${round}-writer`);
			for (const writer of writers) {
				await writer.page.getByPlaceholder('Enter a one word clue...').fill('same');
				await writer.page.getByRole('button', { name: 'Submit Clue', exact: true }).click();
			}
			for (const writer of writers) {
				await writer.page.getByRole('button', { name: 'Done', exact: true }).click();
			}
			await expect(guesser.page.getByPlaceholder('Enter your guess...')).toBeVisible();
			await expect(guesser.page.getByText('<redacted>', { exact: true })).toHaveCount(2);
			await guesser.page.getByPlaceholder('Enter your guess...').fill(word.toUpperCase());
			await guesser.page.getByRole('button', { name: 'Submit Guess', exact: true }).click();
			for (const player of players) {
				await expect(
					player.page.getByText('Correct! You guessed it! 🎉', { exact: true })
				).toBeVisible();
				await expect(
					player.page.getByText(`${round + 1} / ${round + 1} games won`, { exact: true })
				).toBeVisible();
			}
			await expect(
				host.getByText(
					word === 'Loki'
						? `Submitted by ${round === 0 ? 'Alice' : 'Alicia'}, Bob`
						: 'Submitted by Charlie',
					{
						exact: true
					}
				)
			).toBeVisible();
			await capture(host, info, `06-round-${round}-result`);
			if (round === 0) {
				await host.getByRole('button', { name: 'Room settings' }).click();
				await host.getByRole('menuitem', { name: 'Change Name' }).click();
				await host.getByPlaceholder('Enter new username').fill('Alicia');
				await host
					.getByRole('dialog')
					.getByRole('button', { name: 'Change Name', exact: true })
					.click();
				await expect(host.getByTestId('roomHeader-username')).toHaveText('Alicia');
			}
			await host
				.getByRole('button', { name: round === 0 ? 'Next word' : 'Back to lobby', exact: true })
				.click();
		}
		await expect(host.getByRole('button', { name: 'Start Game', exact: true })).toBeVisible();
		await expect(host.getByRole('status')).toContainText('Your words game finished');
		await host.getByRole('radio', { name: /^Classic/ }).check();
		await host.getByRole('button', { name: 'Start Game', exact: true }).click();
		await expect(host.getByText('My role is', { exact: false })).toBeVisible();
		expect(errors).toEqual([]);
	} finally {
		for (const player of players) await player.context.close();
	}
});

test('Your words: unanimous answers return to the lobby with an explanation', async ({
	browser
}, info) => {
	const room = `YD${Date.now().toString().slice(-8)}`;
	const players = [];
	try {
		for (const name of ['Alice', 'Bob', 'Charlie'])
			players.push(await join(browser, name, room, info));
		const host = players[0].page;
		await host.getByRole('radio', { name: /^Your words/ }).check();
		await capture(host, info, '01-lobby');
		await host.getByRole('button', { name: 'Start Game', exact: true }).click();
		for (const player of players) {
			await player.page.getByLabel('Secret word 1').fill('Shrek');
			await player.page.getByRole('button', { name: 'Submit words', exact: true }).click();
		}
		for (const player of players) {
			await expect(
				player.page.getByRole('button', { name: 'Start Game', exact: true })
			).toBeVisible();
			await expect(player.page.getByRole('status')).toContainText(
				'Answers submitted by everyone are excluded'
			);
		}
		await capture(host, info, '02-no-playable-answers');
	} finally {
		for (const player of players) await player.context.close();
	}
});

test('unfinished clues and guess survive real server timeouts', async ({ browser }, info) => {
	test.setTimeout(100000);
	const players = [];
	const room = `YT${Date.now().toString().slice(-8)}`;
	try {
		for (const name of ['Alice', 'Bob', 'Charlie'])
			players.push(await join(browser, name, room, info));
		const host = players[0].page;
		await host.getByRole('radio', { name: /^Your words/ }).check();
		await host.getByRole('button', { name: 'Start Game', exact: true }).click();
		for (const [index, word] of [
			[0, 'Loki'],
			[1, 'LOKI'],
			[2, 'Shrek']
		] satisfies [number, string][]) {
			await players[index].page.getByLabel('Secret word 1').fill(word);
			await players[index].page.getByRole('button', { name: 'Submit words', exact: true }).click();
		}
		for (const player of players)
			await expect(player.page.getByText('My role is', { exact: false })).toBeVisible();
		const writers = [];
		let guesser;
		for (const player of players) {
			if (await player.page.getByText('Everyone is busy writing clues for the secret word').count())
				guesser = player;
			else writers.push(player);
		}
		if (!guesser) throw new Error('No guesser assigned');
		const word = await writers[0].page.locator('.text-primary.text-lg.font-semibold').innerText();
		await writers[0].page.getByPlaceholder('Enter a one word clue...').fill('helmet');
		await writers[1].page.getByPlaceholder('Enter a one word clue...').fill('mischief');
		await capture(writers[0].page, info, '01-unsubmitted-clue');
		await expect(writers[0].page.getByRole('button', { name: 'Done', exact: true })).toBeVisible({
			timeout: 40000
		});
		await expect(writers[0].page.getByText('helmet', { exact: true })).toBeVisible();
		await expect(writers[0].page.getByText('mischief', { exact: true })).toBeVisible();
		await capture(writers[0].page, info, '02-clues-preserved');
		for (const writer of writers) {
			await writer.page.getByRole('button', { name: 'Done', exact: true }).click();
		}
		await guesser.page.getByPlaceholder('Enter your guess...').fill(word);
		await capture(guesser.page, info, '03-unsubmitted-guess');
		await expect(
			guesser.page.getByText('Correct! You guessed it! 🎉', { exact: true })
		).toBeVisible({ timeout: 40000 });
		await expect(guesser.page.getByText('1 / 1 games won', { exact: true })).toBeVisible();
		await capture(guesser.page, info, '04-guess-preserved');
	} finally {
		for (const player of players) await player.context.close();
	}
});

test('player identity survives rename and reload, and leaving removes the renamed player', async ({
	browser
}, info) => {
	const room = `ID${Date.now().toString().slice(-8)}`;
	const players = [];
	try {
		for (const name of ['Alice', 'Bob', 'Charlie'])
			players.push(await join(browser, name, room, info));
		const alice = players[0];
		const bob = players[1].page;
		await expect(bob.getByRole('button', { name: 'Players (3)', exact: true })).toBeVisible();
		await expect.poll(() => alice.identities.length).toBe(1);
		const originalId = alice.identities[0];
		await capture(alice.page, info, '01-before-rename');
		await alice.page.getByRole('button', { name: 'Room settings' }).click();
		await alice.page.getByRole('menuitem', { name: 'Change Name' }).click();
		await alice.page.getByPlaceholder('Enter new username').fill('Alicia');
		await alice.page
			.getByRole('dialog')
			.getByRole('button', { name: 'Change Name', exact: true })
			.click();
		await expect(alice.page.getByTestId('roomHeader-username')).toHaveText('Alicia');
		await expect(bob.getByText('Alicia', { exact: true })).toBeVisible();
		await expect(bob.getByText('Alice', { exact: true })).toHaveCount(0);
		await expect(bob.getByRole('button', { name: 'Players (3)', exact: true })).toBeVisible();
		await capture(bob, info, '02-name-updated-on-other-player');
		await alice.page.reload();
		await alice.page.getByPlaceholder('Enter Room Name').fill(room);
		await alice.page.getByRole('button', { name: 'Join', exact: true }).click();
		await expect(alice.page.getByTestId('roomHeader-username')).toHaveText('Alicia');
		await expect.poll(() => alice.identities.length).toBe(2);
		expect(alice.identities[1]).toBe(originalId);
		await expect(bob.getByRole('button', { name: 'Players (3)', exact: true })).toBeVisible();
		await capture(alice.page, info, '03-same-player-after-reload');
		await alice.page.getByRole('button', { name: 'Room settings' }).click();
		await alice.page.getByRole('menuitem', { name: 'Leave Room' }).click();
		await alice.page
			.getByRole('dialog')
			.getByRole('button', { name: 'Leave Room', exact: true })
			.click();
		await expect(bob.getByRole('button', { name: /Players \(2\)/ })).toBeVisible();
		await expect(bob.getByText('Alicia', { exact: true })).toHaveCount(0);
		await capture(bob, info, '04-no-ghost-after-leaving');
	} finally {
		for (const player of players) await player.context.close();
	}
});
