<script lang="ts">
	import { untrack } from 'svelte';

	interface TimerProps {
		count: number;
		deadlineAt?: number;
		submitAnswer: () => void;
		timerText?: string;
	}

	let { count, deadlineAt, submitAnswer, timerText = 'Time left:' }: TimerProps = $props();
	let remaining = $state(0);
	let finished = $state(false);

	$effect(() => {
		const deadline = deadlineAt ?? Date.now() + Math.max(0, count) * 1000;
		let submitted = false;
		let timer: ReturnType<typeof setInterval> | undefined;
		const update = () => {
			const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
			remaining = left;
			finished = left === 0;
			if (left === 0 && !submitted) {
				submitted = true;
				clearInterval(timer);
				untrack(() => submitAnswer());
			}
		};
		update();
		if (!submitted) timer = setInterval(update, 100);
		return () => clearInterval(timer);
	});
</script>

<div class="space-y-1 text-center">
	{#if finished}
		<div class="text-lg font-medium text-red-600 dark:text-red-400">Time's up!</div>
	{:else}
		<div class="text-muted-foreground text-sm">{timerText}</div>
		<div
			class="text-2xl font-bold {remaining < 10
				? 'text-red-600 dark:text-red-400'
				: 'text-foreground'}"
		>
			{remaining}
		</div>
	{/if}
</div>
