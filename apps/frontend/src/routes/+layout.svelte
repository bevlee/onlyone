<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';

	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
	let title = 'Only One';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="overflow-none mx-auto w-full max-w-[500px]">
	<header class="grid h-14 w-full grid-cols-3 border-b bg-orange-500">
		<div class="flex items-center justify-start pl-2">
			<Button onclick={toggleMode} variant="outline" size="icon">
				<SunIcon
					class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
				/>
				<MoonIcon
					class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</div>

		<h1 class="col-start-2 col-end-3 pt-2 text-center text-2xl font-bold text-white">
			{title}
		</h1>
	</header>

	{@render children()}
</div>

<Toaster />
<ModeWatcher />
