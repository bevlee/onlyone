<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import MainMenu from '$lib/components/MainMenu.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-background">
	<MainMenu />
	<main>
		{@render children?.()}
	</main>
</div>
