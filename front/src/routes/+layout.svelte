<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { ModeWatcher, toggleMode } from "mode-watcher";
	import '../app.css';
  
  	let title = "Only One";
	
	let { children } = $props();
</script>

<ModeWatcher />

<div class="mx-auto w-full max-w-[500px] overflow-none"> 
	<header class="mb-10 w-full border-b bg-orange-500 grid grid-cols-3 h-14">
		<div class="flex justify-start items-center pl-2">
			
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

		
		<h1 class="text-2xl font-bold text-center col-start-2 col-end-3">
			{title}
		</h1>
	</header>
	
	{@render children()}
</div>