<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	
	let { class: className, children, ...props } = $props();
</script>

<DropdownMenuPrimitive.Trigger class={cn('outline-none', className)} {...props}>
	{@render children()}
</DropdownMenuPrimitive.Trigger>