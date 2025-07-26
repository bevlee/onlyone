<script lang="ts">
	import { Button } from './ui/button';
	import { Input } from './ui/input';
	import { defaultTimer } from '../config';
	import Timer from './Timer.svelte';
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

<Timer count={defaultTimer} submitAnswer={() => submit()} />
<h2>Your clues are:</h2>

{#each displayedClues as clue}
	<h3>{clue}</h3>
{/each}

{#if role == 'guesser'}
	<Input class="my-6 max-w-xs content-center" type="text" bind:value={text} />
	<Button onclick={() => submitAnswer(text)}>Submit</Button>
{:else}
	<Button onclick={hide}>Toggle redacted clues</Button>
{/if}
<!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->
