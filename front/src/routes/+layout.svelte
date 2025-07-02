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


<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-14 items-center justify-between px-4">
	  
<Button onclick={toggleMode} variant="outline" size="icon">
	<SunIcon
	  class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
	/>
	<MoonIcon
	  class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
	/>
	<span class="sr-only">Toggle theme</span>
  </Button><!-- Title -->
	  <h1 class="text-lg font-semibold  left-1/2 transform -translate-x-1/2 md:static md:transform-none md:mx-auto">{title}</h1>
	  
	</div>
  </header>
{@render children()}