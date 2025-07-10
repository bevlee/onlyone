<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { defaultTimer } from '../config';
	import Timer from '../components/Timer.svelte';
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
		votes: string[];
		clues: string[];
		secretWord: string;
		role: string;
		updateVotes: () => void;
		submitAnswer: (answer: string) => void;
		leaveGame: () => void;
	};
	let submitted = $state(false);
	let userVotes = $state(new Array(votes.length).fill(0));

	const voteOnClue = (index, value) => {
		console.log(index, value);
		userVotes[index] += value;

		votes[index] += value;
		updateVotes(index, value);
	};
	const hasVoted = (index, value) => {
		return userVotes[index] === value;
	};
</script>

{#if role == 'guesser'}
	<h2>
		<Timer count={defaultTimer} submitAnswer={() => {}} />
		Removing duplicate clues...
	</h2>
{:else}
	<Timer count={defaultTimer} {submitAnswer} />
	<p>The secret word is {secretWord}</p>
	{#each clues as clue, index}
		<div>
			{#if votes[index] < 0}
				{clue} is sus with {votes[index]} votes
			{:else}
				{clue} is good with {votes[index]} votes
			{/if}
			<Button disabled={hasVoted(index, -1)} onclick={() => voteOnClue(index, -1)}>-</Button>
			<Button disabled={hasVoted(index, 1)} onclick={() => voteOnClue(index, 1)}>+</Button>
		</div>
	{/each}

	<br />
	<br />
	<br />
	<br />
	<Button disabled={submitted} onclick={() => submitAnswer()}>
		{submitted ? 'Votes submitted' : 'Looks good to me!'}</Button
	>
{/if}

<!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->
