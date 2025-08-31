<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';

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

<div class="space-y-6">
	{#if role == 'guesser'}
		<div class="text-center space-y-4">
			<Timer count={defaultTimer} submitAnswer={() => {}} />
			<h2 class="text-lg font-medium text-muted-foreground">
				Everyone is busy writing clues for <span class="text-primary font-semibold">{word}</span>
			</h2>
		</div>
	{:else}
		<Timer count={defaultTimer} submitAnswer={submit} />
		
		<div class="rounded-lg border bg-card p-4 text-center space-y-2">
			<div class="text-sm text-muted-foreground">The secret word is</div>
			<div class="font-semibold text-lg text-primary">{word}</div>
		</div>

		<div class="space-y-4 text-center">
			<div class="space-y-2">
				<h2 class="text-lg font-medium">Write a one-word clue</h2>
				<div class="text-sm text-muted-foreground">
					Help others guess the secret word with a single descriptive word
				</div>
			</div>
			
			<Input 
				class="max-w-xs mx-auto text-center" 
				type="text" 
				placeholder="Enter your clue..."
				bind:value={clue} 
			/>

			{#if invalid}
				<div class="text-sm text-orange-600 dark:text-orange-400">
					⚠️ Your clue must be one word only!
				</div>
			{/if}

			<Button 
				disabled={submitted || invalid} 
				onclick={() => submit('manual')}
				class="px-8"
			>
				{submitted ? 'Clue submitted' : 'Submit Clue'}
			</Button>
		</div>
	{/if}
</div>

<!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->
