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

<div class="rounded-lg border bg-card">
	<button 
		class="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors rounded-lg"
		onclick={toggle}
	>
		<h3 class="text-sm font-medium">How to play</h3>
		<ChevronDownIcon 
			class={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} 
		/>
	</button>
	
	{#if expanded}
		<div transition:slide={{ duration: 200 }} class="px-4 pb-4">
			<div class="space-y-3 text-sm text-muted-foreground">
				<ol class="space-y-2 list-inside list-decimal">
					<li>Guesser picks a category</li>
					<li>Others see the word, give one-word clues</li>
					<li>No duplicate clues allowed!</li>
				</ol>
				<div class="pt-2 text-center font-medium text-foreground">
					🎯 Goal: Guess as many words as possible together!
				</div>
			</div>
		</div>
	{/if}
</div>