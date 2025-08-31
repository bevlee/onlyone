<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';
	const { categories, role, submitAnswer, leaveGame } = $props();
	let selectedOption = $state(categories[0]);

	const submit = (): void => {
		submitAnswer(selectedOption);
	};
</script>

<div class="space-y-6">
	<Timer count={defaultTimer} submitAnswer={role === 'guesser' ? () => submit() : () => {}} />

	<div class="mb-6 text-center">
		<p class="text-muted-foreground text-sm">
			My role is <span class="text-foreground font-medium">{role}</span>
		</p>
	</div>
	{#if role == 'guesser'}
		<div class="space-y-4 text-center">
			<h2 class="text-lg font-medium">Choose a category for your secret word</h2>

			<div class="bg-card rounded-lg border p-6">
				<RadioGroup.Root bind:value={selectedOption} class="space-y-3">
					{#each categories as category}
						<div class="flex items-center gap-3">
							<RadioGroup.Item id={category} value={category} />
							<label for={category} class="flex-1 cursor-pointer text-left text-sm font-medium">
								{category}
							</label>
						</div>
					{/each}
				</RadioGroup.Root>
			</div>

			<Button onclick={() => submit()} class="px-8">Select Category</Button>
		</div>
	{:else}
		<div class="space-y-4 text-center">
			<h2 class="text-muted-foreground text-lg font-medium">
				Waiting for guesser to choose category...
			</h2>
			<div class="text-muted-foreground text-sm">
				The guesser is selecting the category for this round.
			</div>
		</div>
	{/if}
</div>
