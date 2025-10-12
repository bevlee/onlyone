<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { theme } from "$lib/stores/theme.svelte.js";

	interface Props {
		variant?: "default" | "outline" | "ghost" | "secondary";
		size?: "default" | "sm" | "lg" | "icon";
		class?: string;
	}

	let { variant = "outline", size = "icon", class: className = "" }: Props = $props();

	function handleToggle() {
		theme.toggle();
	}
</script>

<Button
	{variant}
	{size}
	onclick={handleToggle}
	class="bg-white/90 text-orange-600 hover:bg-white hover:text-orange-700 border-white/50 transition-all hover:scale-110 {className}"
	title={theme.isDark ? "Switch to light mode" : "Switch to dark mode"}
>
	{#if theme.isDark}
		<!-- Sun icon for switching to light mode -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="4"/>
			<path d="m12 2 0 2"/>
			<path d="m12 20 0 2"/>
			<path d="m4.93 4.93 1.41 1.41"/>
			<path d="m17.66 17.66 1.41 1.41"/>
			<path d="m2 12 2 0"/>
			<path d="m20 12 2 0"/>
			<path d="m6.34 17.66-1.41 1.41"/>
			<path d="m19.07 4.93-1.41 1.41"/>
		</svg>
	{:else}
		<!-- Moon icon for switching to dark mode -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
		</svg>
	{/if}
</Button>