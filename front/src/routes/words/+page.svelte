<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	type Difficulty = 'easy' | 'medium' | 'hard';
	const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
	const headers = { 'X-Word-List-Editor': '1' };
	let view = $state<'loading' | 'locked' | 'editor'>('loading');
	let password = $state('');
	let difficulty = $state<Difficulty>('easy');
	let words = $state<string[]>([]);
	let newWord = $state('');
	let busy = $state(false);
	let progress = $state('');
	let error = $state('');
	let message = $state('');

	async function checkedResponse(response: Response): Promise<unknown> {
		const body: unknown = await response.json();
		if (!response.ok) {
			if (response.status === 401 && view === 'editor') {
				view = 'locked';
				throw new Error('Session expired. Enter the password again.');
			}
			throw new Error(
				typeof body === 'object' &&
				body !== null &&
				'error' in body &&
				typeof body.error === 'string'
					? body.error
					: 'Could not save changes. Try again.'
			);
		}
		return body;
	}

	function readWords(body: unknown): string[] {
		if (
			typeof body !== 'object' ||
			body === null ||
			!('words' in body) ||
			!Array.isArray(body.words) ||
			!body.words.every((word): word is string => typeof word === 'string')
		)
			throw new Error('Could not load words.');
		return body.words;
	}

	async function loadWords(selected: Difficulty) {
		busy = true;
		progress = 'Loading words…';
		error = '';
		message = '';
		try {
			const body = await checkedResponse(
				await fetch(`/api/original-words/${selected}`, { headers })
			);
			words = readWords(body);
			difficulty = selected;
			view = 'editor';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not connect. Try again.';
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		void (async () => {
			try {
				const body = await checkedResponse(await fetch('/api/original-words/session', { headers }));
				if (
					typeof body === 'object' &&
					body !== null &&
					'authenticated' in body &&
					body.authenticated === true
				) {
					view = 'editor';
					await loadWords(difficulty);
				} else view = 'locked';
			} catch {
				view = 'locked';
				error = 'Could not connect. Try again.';
			}
		})();
	});

	async function unlockEditor() {
		busy = true;
		error = '';
		try {
			await checkedResponse(
				await fetch('/api/original-words/session', {
					method: 'POST',
					headers: { ...headers, 'Content-Type': 'application/json' },
					body: JSON.stringify({ password })
				})
			);
			password = '';
			view = 'editor';
			await loadWords(difficulty);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not connect. Try again.';
		} finally {
			busy = false;
		}
	}

	async function changeWord(method: 'POST' | 'DELETE', word: string) {
		busy = true;
		progress = 'Saving…';
		error = '';
		message = '';
		try {
			const body = await checkedResponse(
				await fetch(`/api/original-words/${difficulty}/words`, {
					method,
					headers: { ...headers, 'Content-Type': 'text/plain' },
					body: word
				})
			);
			words = readWords(body);
			if (method === 'POST') newWord = '';
			message = 'Saved.';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not connect. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>Original words · Only One</title><meta name="robots" content="noindex" /></svelte:head
>
<main class="space-y-6 p-5">
	{#if view === 'loading'}
		<p role="status" class="text-muted-foreground">Loading words…</p>
	{:else if view === 'locked'}
		<h2 class="text-xl font-semibold">Word list editor</h2>
		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				void unlockEditor();
			}}
		>
			<div class="space-y-2">
				<label for="editor-password" class="text-sm font-medium">Password</label><Input
					id="editor-password"
					type="password"
					autocomplete="current-password"
					bind:value={password}
					disabled={busy}
					required
				/>
			</div>
			{#if error}<p role="alert" class="text-sm text-red-600 dark:text-red-400">{error}</p>{/if}
			<Button type="submit" disabled={busy || !password} class="w-full"
				>{busy ? 'Unlocking…' : 'Unlock'}</Button
			>
		</form>
	{:else}
		<div class="flex items-center justify-between gap-4">
			<h2 class="text-xl font-semibold">Original words</h2>
		</div>
		<div class="flex gap-2" role="group" aria-label="Difficulty">
			{#each difficulties as option}<Button
					variant={difficulty === option ? 'default' : 'outline'}
					aria-pressed={difficulty === option}
					disabled={busy}
					onclick={() => loadWords(option)}
					class="flex-1">{option.charAt(0).toUpperCase() + option.slice(1)}</Button
				>{/each}
		</div>
		<form
			class="space-y-2"
			onsubmit={(event) => {
				event.preventDefault();
				void changeWord('POST', newWord);
			}}
		>
			<label for="new-word" class="text-sm font-medium">Add a secret word</label>
			<div class="flex gap-2">
				<Input
					id="new-word"
					bind:value={newWord}
					maxlength={60}
					autocomplete="off"
					disabled={busy}
					required
				/><Button type="submit" disabled={busy || !newWord.trim()}>Add</Button>
			</div>
		</form>
		{#if error}<p role="alert" class="text-sm text-red-600 dark:text-red-400">{error}</p>{/if}
		<p role="status" class="text-muted-foreground text-sm">{busy ? progress : message}</p>
		<ul class="divide-y border-y" aria-label={`${difficulty} secret words`}>
			{#each words as word (word)}<li class="flex min-h-14 items-center justify-between gap-3 py-2">
					<span class="min-w-0 break-words">{word}</span><Button
						variant="outline"
						size="sm"
						disabled={busy || words.length === 1}
						aria-label={`Remove ${word}`}
						title={words.length === 1 ? 'Keep at least one secret word' : `Remove ${word}`}
						onclick={() => changeWord('DELETE', word)}>Remove</Button
					>
				</li>{/each}
		</ul>
	{/if}
</main>
