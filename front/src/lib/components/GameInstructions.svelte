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
					<li>Everyone takes turns at guessing and writing clues</li>
					<li>Guesser picks a difficulty</li>
					<li>Others see a secret word, give one-word clues</li>
					<li>Hide Duplicate clues from the guesser!</li>
				</ol>
				<div class="text-foreground pt-2 text-center text-lg font-medium">
					🎯 Goal: Guess as many words as possible together!
				</div>
				<hr />
				<div class="space-y-3">
					<h2 class="text-lg font-bold">Example Game:</h2>
					<div class="bg-muted rounded p-3">
						<p class="mb-2 font-mono text-xs font-semibold">Secret word: KANGAROO</p>
						<p class="text-xs">Difficulty: Easy</p>
					</div>

					<div class="bg-secondary/20 rounded p-3">
						<p class="mb-2 text-xs font-semibold">Writers submit:</p>
						<div class="flex flex-wrap gap-2">
							<span class="rounded bg-yellow-500/20 px-2 py-1 text-xs">"hop"</span>
							<span class="rounded bg-yellow-500/20 px-2 py-1 text-xs">"australian"</span>
							<span class="rounded bg-yellow-500/20 px-2 py-1 text-xs">"animal"</span>
							<span class="rounded bg-yellow-500/20 px-2 py-1 text-xs">"pouch"</span>
							<span class="rounded bg-yellow-500/20 px-2 py-1 text-xs">"australian"</span>
						</div>
					</div>

					<div class="rounded border border-red-500/30 bg-red-500/10 p-3">
						<p class="mb-2 text-xs font-semibold">⚠️ Duplicates should be marked for removal:</p>
						<p class="text-muted-foreground text-xs">"australian" gets filtered out</p>
					</div>

					<div class="rounded border border-green-500/30 bg-green-500/10 p-3">
						<p class="mb-2 text-xs font-semibold">✓ Guesser sees:</p>
						<div class="flex flex-wrap gap-2">
							<span class="rounded bg-blue-500/20 px-2 py-1 text-xs">"hop"</span>
							<span class="rounded bg-blue-500/20 px-2 py-1 text-xs">"animal"</span>
							<span class="rounded bg-blue-500/20 px-2 py-1 text-xs">"pouch"</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
