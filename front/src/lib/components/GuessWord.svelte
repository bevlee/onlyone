<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';
	const { dedupedClues, clues, role, submitAnswer, leaveGame }: Props = $props();

	type Props = {
		dedupedClues: string[];
		clues: string[];
		role: string;
		submitAnswer: (answer: string) => void;
		leaveGame: () => void;
	};

	let text = $state('');

	let displayedClues = $state(dedupedClues);
	let hidden = false;
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

	<div class="rounded-lg border bg-card p-4 space-y-3">
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
				<div class="rounded bg-muted/50 px-3 py-2 text-sm text-center">
					{clue || '(empty)'}
				</div>
			{/each}
		</div>
	</div>

	{#if role == 'guesser'}
		<div class="space-y-4 text-center">
			<div class="text-sm text-muted-foreground">
				What's the secret word?
			</div>
			<Input 
				class="max-w-xs mx-auto text-center" 
				type="text" 
				placeholder="Enter your guess..."
				bind:value={text} 
			/>
			<Button onclick={() => submitAnswer(text)} class="px-8">
				Submit Guess
			</Button>
		</div>
	{/if}
</div>
<!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->
