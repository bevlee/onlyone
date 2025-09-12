<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';
	const {
		votes = $bindable(),
		clues = [],
		secretWord,
		role,
		updateVotes,
		submitAnswer,
		leaveGame
	}: Props = $props();

	type Props = {
		votes: number[];
		clues: string[];
		secretWord: string;
		role: string;
		updateVotes: (index: number, value: number) => void;
		submitAnswer: () => void;
		leaveGame: () => void;
	};
	let submitted = $state(false);
	let userVotes = $state(new Array(votes.length).fill(0));

	const voteOnClue = (index: number, value: number) => {
		console.log(index, value);
		userVotes[index] += value;

		votes[index] += value;
		updateVotes(index, value);
	};
	const hasVoted = (index: number, value: number) => {
		return userVotes[index] === value;
	};
</script>

<div class="space-y-6">
	{#if role == 'guesser'}
		<div class="space-y-4 text-center">
			<Timer count={defaultTimer} submitAnswer={() => {}} />
			<h2 class="text-muted-foreground text-lg font-medium">Removing duplicate clues...</h2>
		</div>
	{:else}
		<Timer count={defaultTimer} {submitAnswer} />

		<div class="bg-card rounded-lg border p-4 text-center">
			<div class="text-muted-foreground text-sm">The secret word is</div>
			<div class="text-primary mt-1 text-lg font-semibold">{secretWord}</div>
		</div>

		<div class="space-y-3">
			{#each clues as clue, index}
				<div class="bg-card space-y-3 rounded-lg border p-4">
					<div class="text-center">
						<div class="font-medium">{clue || '(empty)'}</div>
						<div class="text-muted-foreground mt-1 text-sm">
							{#if votes[index] < 0}
								Duplicate - {Math.abs(votes[index])} votes
							{:else}
								Good clue - {votes[index]} votes
							{/if}
						</div>
					</div>

					<div class="flex justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={hasVoted(index, -1)}
							onclick={() => voteOnClue(index, -1)}
							class="min-w-0 whitespace-normal px-3 py-2 text-center"
						>
							Duplicate (-1 vote)
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={hasVoted(index, 1)}
							onclick={() => voteOnClue(index, 1)}
							class="min-w-0 whitespace-normal px-3 py-2 text-center"
						>
							Unique (+1 vote)
						</Button>
					</div>
				</div>
			{/each}
		</div>

		<div class="text-center">
			<Button disabled={submitted} onclick={() => submitAnswer()} class="px-8">
				{submitted ? 'Votes submitted' : 'Looks good to me!'}
			</Button>
		</div>
	{/if}
</div>

<!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->
