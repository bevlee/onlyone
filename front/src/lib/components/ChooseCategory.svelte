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

{#if role == 'guesser'}
	<Timer count={defaultTimer} submitAnswer={() => submit()} />
	<div>
		<h2>Choose a category for your secret word</h2>
		<RadioGroup.Root bind:value={selectedOption}>
			{#each categories as category}
				<div class="flex items-center space-x-2">
					<RadioGroup.Item id={category} value={category} />
					<label for={category}>{category}</label>
				</div>
			{/each}
		</RadioGroup.Root>
	</div>
	<Button onclick={() => submit()}>Select</Button>
{:else}
	<Timer count={defaultTimer} submitAnswer={() => {}} />
	<h2>Please wait... the guesser is choosing the category</h2>
{/if}
