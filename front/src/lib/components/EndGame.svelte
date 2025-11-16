<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	interface EndGameProps {
		difficulty: string;
		dedupedClues: Array<string>;
		clues: Array<string>;
		guess: string;
		secretWord: string;
		wordGuessed: boolean;
		gamesPlayed: number;
		gamesWon: number;
		playAgain: () => void;
		currentGuesser: string;
	}

	const {
		difficulty,
		dedupedClues,
		clues,
		guess,
		secretWord,
		wordGuessed,
		gamesPlayed,
		gamesWon,
		playAgain,
		currentGuesser
	}: EndGameProps = $props();

	let displayedClues = $state(dedupedClues);
	let hidden: boolean = $state(false);
	const hide = (): void => {
		hidden = !hidden;
		displayedClues = hidden ? clues : dedupedClues;
	};
</script>

<div class="space-y-6">
	<!-- Game Result Header -->
	<div class="space-y-2 text-center">
		{#if wordGuessed}
			<h2 class="text-xl font-semibold text-green-600 dark:text-green-400">
				Correct! You guessed it! 🎉
			</h2>
		{:else}
			<h2 class="text-xl font-semibold text-orange-600 dark:text-orange-400">
				Incorrect guess! 😔
			</h2>
		{/if}
	</div>

	<!-- Game Details -->
	<div class="space-y-4">
		<div class="bg-card space-y-2 rounded-lg border p-4">
			<div class="space-y-2 text-center">
				<div class="text-muted-foreground text-sm">Difficulty</div>
				<div class="font-medium">{difficulty}</div>
			</div>

			<div class="space-y-2 border-t pt-3">
				<div class="text-muted-foreground text-sm">
					<span class="text-foreground font-medium">{currentGuesser}'s</span> guess
				</div>
				<div class="text-center font-medium">{guess || '<no guess>'}</div>
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

	<div class="text-center">
		<Button onclick={playAgain} class="px-8">Play Again</Button>
	</div>
</div>
