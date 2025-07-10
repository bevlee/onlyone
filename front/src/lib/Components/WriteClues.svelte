<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { defaultTimer } from '../config';
	import Timer from '../components/Timer.svelte';
	const { word, role, submitAnswer, leaveGame } = $props();
	let clue = $state('');
	let submitted = $state(false);

	// clue must be one word!
	let invalid = $derived(clue.includes(' '));

	const submit = (submitType = 'auto') => {
		if (clue === word || clue.includes(' ')) {
			// no point prompting user if it was an auto-submit. Just do not submit it in this case
			if (!(submitType === 'auto')) {
				alert('you cannot write the secret as a clue!');
			} else {
				//submit an empty string if the autosubmission would be invalid
				submitAnswer('');
			}
		} else {
			submitted = true;
			submitAnswer(clue);
		}
	};
</script>

{#if role == 'guesser'}
	<h2>
		<Timer count={defaultTimer} submitAnswer={() => {}} />
		Everyone is busy writing prompts <em>{word}</em>
	</h2>
{:else}
	<Timer count={defaultTimer} submitAnswer={submit} />
	<h2>
		The Secret word is <em>{word}</em>
	</h2>
	<h2>Please write a ONE WORD clue</h2>
	<Input class="max-w-xs content-center" type="text" bind:value={clue} />

	<Button disabled={submitted || invalid} onclick={() => submit('manual')}
		>{submitted ? 'Answer submitted' : 'Submit'}</Button
	>
	{#if invalid}
		<p class="warning">Your clue must be one word!!!</p>
	{/if}
{/if}

<!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->
