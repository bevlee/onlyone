<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';

	const {
		category,
		dedupedClues,
		clues,
		guess,
		secretWord,
		wordGuessed,
		gamesPlayed,
		gamesWon,
		totalRounds,
		playAgain
	} = $props();
	console.log(`ending game`, dedupedClues, clues, guess, category);

	let displayedClues = $state(dedupedClues);
	let hidden = false;
	const hide = () => {
		hidden = !hidden;
		displayedClues = hidden ? clues : dedupedClues;
	};
	console.log('played:', gamesPlayed, ' total', totalRounds);
</script>

<div class="space-y-6">
	<!-- Game Result Header -->
	<div class="space-y-2 text-center">
		{#if wordGuessed}
			<div class="text-2xl">🎉</div>
			<h2 class="text-xl font-semibold text-green-600 dark:text-green-400">
				Correct! You guessed it!
			</h2>
		{:else}
			<div class="text-2xl">😔</div>
			<h2 class="text-xl font-semibold text-orange-600 dark:text-orange-400">Incorrect guess!</h2>
		{/if}
	</div>

	<!-- Game Details -->
	<div class="space-y-4">
		<div class="bg-card space-y-3 rounded-lg border p-4">
			<div class="space-y-2 text-center">
				<div class="text-muted-foreground text-sm">Category</div>
				<div class="font-medium">{category}</div>
			</div>

			<div class="space-y-2 border-t pt-3">
				<div class="text-muted-foreground text-sm">Your guess</div>
				<div class="text-center font-medium">{guess || 'No guess'}</div>
			</div>

			<div class="space-y-2 border-t pt-3">
				<div class="text-muted-foreground text-sm">The secret word was</div>
				<div class="text-primary text-center text-lg font-extrabold">{secretWord}</div>
			</div>
		</div>

		<!-- Clues Section -->
		<div class="bg-card space-y-3 rounded-lg border p-4">
			<div class="flex items-center justify-between">
				<h3 class="font-medium">Clues</h3>
				<Button variant="outline" size="sm" onclick={hide}>
					{hidden ? 'Hide Duplicates' : 'Show All Clues'}
				</Button>
			</div>

			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each displayedClues as clue}
					<div class="bg-muted/50 rounded px-3 py-2 text-center text-sm">
						{clue || '(empty)'}
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="space-y-2 text-center">
		<div class="text-muted-foreground text-sm">Team Score</div>
		<div class="text-lg font-semibold">
			{gamesWon} / {gamesPlayed} games won
		</div>
	</div>

	<!-- Next Action -->
	{#if gamesPlayed < totalRounds}
		<div class="text-center">
			<Timer count={defaultTimer} submitAnswer={() => {}} text="Next round starts in: " />
		</div>
	{:else}
		<div class="text-center">
			<Button onclick={playAgain} class="px-8">Play Again</Button>
		</div>
	{/if}
</div>
