<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { ModeWatcher, toggleMode } from "mode-watcher";
	import '../app.css';
  
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

<div class="mx-auto max-w-[500px] overflow-none"> 

	<header class="sticky top-0 z-50 w-full border-b bg-orange-500 grid grid-cols-3 h-14">
		<div class="flex justify-start items-center pl-4">
		  
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
		<h1 class="text-4xl  font-bold text-center col-start-2 col-end-3">
			Only One
		  </h1>
	  </header>

</div>
{@render children()}