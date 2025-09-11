<script lang="ts">
	import { onDestroy } from 'svelte';
	let timer: ReturnType<typeof setInterval> | undefined = undefined;
	let { count, submitAnswer, timerText = 'Time left:', socket = null } = $props();
	let timerFinished = $state(false);
	let currentCount = $state(count);
	
	// Reset timer when count prop changes (new phase)
	$effect(() => {
		if (count !== currentCount && count > 0) {
			timerFinished = false;
			currentCount = count;
		}
	});
	
	// Use server-side timer updates if socket is available, otherwise fallback to client timer
	$effect(() => {
		// Clear any existing timer first
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
		
		// Reset finished state when effect runs
		timerFinished = false;
		
		if (socket) {
			// Server-only mode: listen for server timer updates
			const handleTimerUpdate = (serverCount: number) => {
				console.log('Timer update received:', serverCount);
				currentCount = serverCount;
				if (serverCount <= 0) {
					timerFinished = true;
					submitAnswer();
				} else {
					timerFinished = false;
				}
			};
			
			socket.on('timerUpdate', handleTimerUpdate);
			
			return () => {
				socket.off('timerUpdate', handleTimerUpdate);
			};
		} else {
			// Fallback to client-side timer when no socket
			console.log('Using client-side timer fallback');
			currentCount = count;
			timer = setInterval(() => {
				if (currentCount > 0) {
					timerFinished = false;
					currentCount -= 1;
				} else {
					timerFinished = true;
					clearInterval(timer);
					timer = undefined;
					submitAnswer();
				}
			}, 1000);
			
			return () => {
				if (timer) {
					clearInterval(timer);
					timer = undefined;
				}
			};
		}
	});

	onDestroy(() => {
		if (timer) {
			clearInterval(timer);
		}
	});
</script>

<div class="text-center space-y-1">
	{#if timerFinished}
		<div class="text-lg font-medium text-red-600 dark:text-red-400">Time's up!</div>
	{:else}
		<div class="text-sm text-muted-foreground">{timerText}</div>
		<div class="text-2xl font-bold {currentCount < 10 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}">
			{currentCount}
		</div>
	{/if}
</div>
