<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { ModeWatcher, toggleMode } from "mode-watcher";
	import '../app.css';
  
    let isMobileDevice = window.screen.width < 768;
    let maxWidth = window.screen.width - 100;
    console.log(maxWidth)
   let title = "Only One";
  
  let isOpen = false;
  
  const menuItems = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Contact", href: "/contact" }
  ];
	let { children } = $props();
</script>
<ModeWatcher />

{#if isMobileDevice}

<!-- <div class="aspect-[4/3] w-5/6 mx-auto m-6 bg-emerald-400 overflow-hidden">
  <p>Mobile View</p>
  </div> -->

  {@render header(maxWidth)}
{:else}
  <!-- <div class="aspect-[4/3] w-5/6 mx-auto bg-yellow-400 overflow-hidden">
	</div> -->

	{@render header(500)}
	{/if}
	

	{#snippet header(width:number)}
	<div class="mx-auto max-w-[{width}px] overflow-none"> 

		<header class="sticky top-0 z-50 w-full border-b bg-orange-500 grid grid-cols-3 h-14">
			<div class="flex justify-start items-center pl-[2]">
			  
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
			<!-- <h1 class="text-lg font-semibold  left-1/2 transform -translate-x-1/2 md:static md:transform-none md:mx-auto">{title}</h1> -->
			<h1 class="text-2xl font-bold text-center col-start-2 col-end-3">
				Only One
			  </h1>
		  </header>
	
	</div>
	{/snippet}
{@render children()}