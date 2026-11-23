<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';

	interface WriteCluesProps {
		word: string;
		role: string;
		deadlineAt: number;
		submitAnswer: (clue: string) => void;
		currentGuesser: string;
	}

	const { word, role, deadlineAt, submitAnswer, currentGuesser }: WriteCluesProps = $props();
	let clue = $state('');
	let submitted = $state(false);

	const invalid = $derived(
		/\s/.test(clue.trim()) || clue.trim().toLowerCase() === word.trim().toLowerCase()
	);

	const submit = () => {
		if (submitted || role === 'guesser') return;
		submitted = true;
		submitAnswer(invalid ? '' : clue.trim());
	};
</script>

<div class="space-y-6">
	{#if role && role == 'guesser'}
		<div class="space-y-4 text-center">
			<Timer {deadlineAt} count={defaultTimer} submitAnswer={() => {}} />
			<h2 class="text-muted-foreground text-lg font-medium">
				Everyone is busy writing clues for the secret word
			</h2>
		</div>
	{:else}
		<Timer {deadlineAt} count={defaultTimer} submitAnswer={submit} />

		<div class="bg-card space-y-2 rounded-lg border p-4 text-center">
			<div class="text-muted-foreground text-sm">The secret word is</div>
			<div class="text-primary text-lg font-semibold">{word}</div>
		</div>

		<div class="space-y-4 text-center">
			<div class="space-y-2">
				<h2 class="text-lg font-medium">Write a one-word clue</h2>
				<div class="text-muted-foreground text-sm">
					Help <span class="text-foreground font-medium">{currentGuesser}</span> guess the secret word
					with a single descriptive word
				</div>
			</div>

			<Input
				class="mx-auto max-w-xs text-center"
				type="text"
				placeholder="Enter a one word clue..."
				bind:value={clue}
				maxlength={60}
				disabled={submitted}
			/>

			{#if invalid}
				<div class="text-sm text-orange-600 dark:text-orange-400">
					Use one word that is different from the secret word.
				</div>
			{/if}

			<Button disabled={submitted || invalid || !clue.trim()} onclick={submit} class="px-8">
				{submitted ? 'Clue submitted' : 'Submit Clue'}
			</Button>
		</div>
	{/if}
</div>
