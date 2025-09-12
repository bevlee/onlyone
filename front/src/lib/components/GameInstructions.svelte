<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { slide } from 'svelte/transition';

	// Initialize state
	const getInitialState = () => {
		const saved = localStorage.getItem('howToPlayExpanded');
		// Default to expanded for first-time visitors (null), collapsed for returning users
		return saved === null ? true : saved === 'true';
	};

	let expanded = $state(getInitialState());

	const toggle = () => {
		expanded = !expanded;
		localStorage.setItem('howToPlayExpanded', expanded.toString());
	};
</script>

<div class="bg-card rounded-lg border">
	<button
		class="hover:bg-accent/50 flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors"
		onclick={toggle}
	>
		<h3 class="text-sm font-medium">How to play</h3>
		<ChevronDownIcon class={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
	</button>

	{#if expanded}
		<div transition:slide={{ duration: 200 }} class="px-4 pb-4">
			<div class="text-muted-foreground space-y-3 text-sm">
				<ol class="list-inside list-decimal space-y-2">
					<li>Guesser picks a difficulty</li>
					<li>Others see the word, give one-word clues</li>
					<li>No duplicate clues allowed!</li>
				</ol>
				<div class="text-foreground pt-2 text-center font-medium">
					🎯 Goal: Guess as many words as possible together!
				</div>
			</div>
		</div>
	{/if}
</div>
