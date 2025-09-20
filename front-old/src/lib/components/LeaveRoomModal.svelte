<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	let { 
		open = $bindable(),
		roomName,
		onConfirm
	}: {
		open: boolean;
		roomName: string;
		onConfirm: () => void;
	} = $props();

	const handleConfirm = () => {
		open = false;
		onConfirm();
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<LogOutIcon class="h-5 w-5 text-orange-600" />
				Leave Room?
			</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to leave "<strong>{roomName}</strong>"? 
				{#if open}
					You'll need to rejoin to continue playing.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => open = false}>
				Stay in Room
			</Button>
			<Button variant="destructive" onclick={handleConfirm}>
				<LogOutIcon class="mr-2 h-4 w-4" />
				Leave Room
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>