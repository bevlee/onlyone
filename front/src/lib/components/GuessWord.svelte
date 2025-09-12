<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';
	const { dedupedClues, clues, role, submitAnswer }: Props = $props();

	type Props = {
		dedupedClues: string[];
		clues: string[];
		role: string;
		submitAnswer: (answer: string) => void;
	};

	let text = $state('');

	let displayedClues = $state(dedupedClues);
	let hidden = $state(false);
	const hide = () => {
		hidden = !hidden;
		displayedClues = hidden ? clues : dedupedClues;
	};
	const submit = () => {
		submitAnswer(text);
	};
</script>

<div class="space-y-6">
	<Timer count={defaultTimer} submitAnswer={() => submit()} />

	<div class="bg-card space-y-3 rounded-lg border p-4">
		<div class="flex items-center justify-between">
			<h2 class="font-medium">Your clues</h2>
			{#if role !== 'guesser'}
				<Button variant="outline" size="sm" onclick={hide}>
					{hidden ? 'Hide Duplicates' : 'Show All Clues'}
				</Button>
			{/if}
		</div>

		<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each displayedClues as clue}
				<div class="bg-muted/50 rounded px-3 py-2 text-center text-sm">
					{clue || '(empty)'}
				</div>
			{/each}
		</div>
	</div>

	{#if role == 'guesser'}
		<div class="space-y-4 text-center">
			<div class="text-muted-foreground text-sm">What's the secret word?</div>
			<Input
				class="mx-auto max-w-xs text-center"
				type="text"
				placeholder="Enter your guess..."
				bind:value={text}
			/>
			<Button onclick={() => submitAnswer(text)} class="px-8">Submit Guess</Button>
		</div>
	{/if}
</div>
