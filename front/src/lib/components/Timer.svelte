<script lang="ts">
	import { onDestroy } from 'svelte';
	let timer: ReturnType<typeof setInterval> | undefined = undefined;
	interface TimerProps {
		count: number;
		submitAnswer: () => void;
		timerText?: string;
	}

	let { count, submitAnswer, timerText = 'Time left:' }: TimerProps = $props();
	$effect(() => {
		timer = setInterval(() => {
			if (count > 0) {
				timerFinished = false;
				count -= 1;
			} else {
				timerFinished = true;
				stopTimer();
			}
		}, 1000);
	});
	let timerFinished = $state(false);

	onDestroy(() => {
		clearInterval(timer);
	});
	const stopTimer = () => {
		clearInterval(timer);
		timer = undefined;
		submitAnswer();
	};
</script>

<div class="space-y-1 text-center">
	{#if timerFinished}
		{stopTimer()}
		<div class="text-lg font-medium text-red-600 dark:text-red-400">Time's up!</div>
	{:else}
		<div class="text-muted-foreground text-sm">{timerText}</div>
		<div
			class="text-2xl font-bold {count < 10 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}"
		>
			{count}
		</div>
	{/if}
</div>
