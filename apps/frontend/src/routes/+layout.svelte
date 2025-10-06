<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { userStore } from '$lib/stores/user.svelte.js';
	import { Toaster } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import '../app.css';

	let { data, children } = $props();
	let title = 'Only One';

	// Track the data.user to update store, but don't track store updates
	$effect(() => {
		const user = data.user; // Track data.user changes
		untrack(() => {
			// Don't track store updates to prevent loops
			userStore.updateFromUserData(user);
		});
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

<Toaster />
