<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';

	interface ChooseDifficultyProps {
		difficulties: Array<string>;
		role: string;
		submitAnswer: (difficulty: string) => void;
	}

	const { difficulties, role, submitAnswer }: ChooseDifficultyProps = $props();
	let selectedOption = $state(difficulties[0]);

	const submit = (): void => {
		submitAnswer(selectedOption);
	};
</script>

<div class="space-y-6">
	<Timer count={defaultTimer} submitAnswer={role === 'guesser' ? () => submit() : () => {}} />

	{#if role == 'guesser'}
		<div class="space-y-4 text-center">
			<h2 class="text-lg font-medium">Choose a difficulty for your secret word</h2>

			<div class="bg-card rounded-lg border p-6">
				<RadioGroup.Root bind:value={selectedOption} class="space-y-3">
					{#each difficulties as difficulty}
						<div class="flex items-center gap-3">
							<RadioGroup.Item id={difficulty} value={difficulty} />
							<label for={difficulty} class="flex-1 cursor-pointer text-left text-sm font-medium">
								{difficulty}
							</label>
						</div>
					{/each}
				</RadioGroup.Root>
			</div>

			<Button onclick={() => submit()} class="px-8">Select Difficulty</Button>
		</div>
	{:else}
		<div class="space-y-4 text-center">
			<div class="text-muted-foreground text-lg font-medium">
				The guesser is selecting the difficulty for this round.
			</div>
		</div>
	{/if}
</div>
