<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	
	let { children, ...props } = $props();
</script>

<DropdownMenuPrimitive.Root {...props}>
	{@render children()}
</DropdownMenuPrimitive.Root>