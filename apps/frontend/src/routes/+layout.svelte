<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { userStore } from '$lib/stores/user.svelte.js';
	import '../app.css';

	let { children } = $props();
	let title = 'Only One';

	// Initialize anonymous session if no auth exists
	onMount(async () => {
		if (browser && !userStore.state.isLoading) {
			// Wait a tick for initial auth check to complete
			await new Promise(resolve => setTimeout(resolve, 100));

			// If still not authenticated after check, sign in anonymously
			if (!userStore.state.isAuthenticated) {
				await userStore.signInAnonymously();
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="overflow-none mx-auto w-full max-w-[500px]">
	<header class="grid h-14 w-full grid-cols-3 border-b bg-orange-500">
		<div class="flex items-center justify-start pl-2">
			<ThemeToggle />
		</div>

		<h1 class="col-start-2 col-end-3 pt-2 text-center text-2xl font-bold text-white">
			{title}
		</h1>
	</header>

	{@render children()}
</div>
