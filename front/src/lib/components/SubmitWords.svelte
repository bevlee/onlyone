<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Timer from './Timer.svelte';
	import { Input } from '$lib/components/ui/input';
	import { tick } from 'svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';

	const MAX_WORDS = 3;

	let {
		deadlineAt,
		submitted,
		total,
		onSubmit
	}: {
		deadlineAt: number;
		submitted: number;
		total: number;
		onSubmit: (words: string[]) => Promise<{ success: boolean; reason?: string }>;
	} = $props();

	let words = $state(['']);
	let locked = $state(false);
	let sending = $state(false);
	let error = $state('');
	const answers = $derived(words.map((word) => word.trim()).filter(Boolean));

	async function addWord() {
		if (words.length >= MAX_WORDS) return;
		words.push('');
		await tick();
		document.getElementById(`secret-word-${words.length - 1}`)?.focus();
	}

	function removeWord(index: number) {
		words.splice(index, 1);
	}

	async function submit() {
		if (sending || locked || !answers.length) return;
		sending = true;
		error = '';
		try {
			const result = await onSubmit(answers);
			if (result.success) locked = true;
			else error = result.reason || 'Please try again.';
		} catch {
			error = 'Could not submit your words. Please try again.';
		} finally {
			sending = false;
		}
	}
</script>

<div class="mx-auto max-w-md space-y-6">
	<Timer count={180} {deadlineAt} submitAnswer={submit} />
	<div class="space-y-2 text-center">
		<h2 class="text-xl font-semibold">Add your secret words</h2>
		<p class="text-muted-foreground text-sm">
			Add 1–3 secret words your friends could guess with the right clues. People, places,
			characters, and in-jokes are welcome. Keep them secret!
		</p>
		<p class="text-muted-foreground text-sm">You won't be the guesser for your own secret words.</p>
	</div>
	<form
		class="space-y-4"
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
	>
		{#each words as _, index}
			<div class="space-y-1">
				<label for={`secret-word-${index}`} class="text-sm font-medium"
					>Secret word {index + 1}</label
				>
				<div class="flex gap-2">
					<Input
						id={`secret-word-${index}`}
						bind:value={words[index]}
						maxlength={60}
						disabled={locked || sending}
						autocomplete="off"
					/>
					{#if index > 0 && !locked}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={`Remove secret word ${index + 1}`}
							disabled={sending}
							onclick={() => removeWord(index)}
						>
							<XIcon class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>
		{/each}
		{#if words.length < MAX_WORDS && !locked}
			<Button type="button" variant="outline" class="w-full" disabled={sending} onclick={addWord}>
				<PlusIcon class="h-4 w-4" />
				Add another secret word
			</Button>
		{/if}
		{#if error}<p role="alert" class="text-sm text-red-600">{error}</p>{/if}
		<Button type="submit" class="w-full" disabled={locked || sending || !answers.length}>
			{locked ? 'Words submitted' : sending ? 'Submitting…' : 'Submit words'}
		</Button>
	</form>
	<div class="space-y-2 text-center" aria-live="polite">
		<p class="text-sm font-medium">{submitted} / {total} players ready</p>
		<p class="text-muted-foreground text-sm">
			{locked
				? 'Waiting for the others. Roles are assigned once the words are in.'
				: 'The game starts when everyone submits, or after 3 minutes.'}
		</p>
	</div>
</div>
