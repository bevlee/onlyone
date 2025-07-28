<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import '../app.css';

	let title = 'Only One';

	let { children } = $props();
</script>

<ModeWatcher />

<div class="overflow-none mx-auto w-full max-w-[500px]">
	<header class="mb-10 grid h-14 w-full grid-cols-3 border-b bg-orange-500">
		<div class="flex items-center justify-start pl-2">
			<Button onclick={toggleMode} variant="outline" size="icon">
				<SunIcon
					class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
				/>
				<MoonIcon
					class="absolute h-[1.2rem] w-[1.2rem] scale-0 !transition-all dark:rotate-0 dark:scale-100"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</div>

		<h1 class="col-start-2 col-end-3 text-center text-2xl font-bold">
			{title}
		</h1>
	</header>

	{@render children()}
</div>
