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
		submitAnswer
	}: Props = $props();

	type Props = {
		votes: number[];
		clues: string[];
		secretWord: string;
		role: string;
		updateVotes: (index: number, value: number) => void;
		submitAnswer: () => void;
	};
	let submitted = $state(false);
	let userVotes = $state(new Array(votes.length).fill(0));

	const voteOnClue = (index: number, value: number) => {
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

		<h2 class="text-lg">Mark the clues as Duplicate or Unique</h2>
		<div class="space-y-2">
			{#each clues as clue, index}
				<div class="bg-card flex items-center justify-between rounded-lg border px-4 py-3">
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<div
							class="truncate text-base font-medium {votes[index] < 0
								? 'text-red-600 dark:text-red-400'
								: 'text-green-600 dark:text-green-400'}"
						>
							{clue || '(empty)'}
						</div>
						<div class="text-muted-foreground text-sm">
							({votes[index]} votes)
						</div>
					</div>
					<div class="flex flex-shrink-0 gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={hasVoted(index, -1)}
							onclick={() => voteOnClue(index, -1)}
							class="px-3 py-2"
							title="Mark as duplicate"
						>
							❌ Duplicate
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={hasVoted(index, 1)}
							onclick={() => voteOnClue(index, 1)}
							class="px-3 py-2"
							title="Mark as unique"
						>
							✅ Unique
						</Button>
					</div>
				</div>
			{/each}
		</div>

		<div class="text-center">
			<Button disabled={submitted} onclick={() => submitAnswer()} class="px-8">
				{submitted ? 'Votes submitted' : 'Proceed to guessing'}
			</Button>
		</div>
	{/if}
</div>
