<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let {
		open = $bindable(),
		currentName,
		onSubmit,
		isSubmitting = false
	}: {
		open: boolean;
		currentName: string;
		onSubmit: (newName: string) => Promise<boolean>;
		isSubmitting?: boolean;
	} = $props();

	let newName = $state(currentName);
	let error = $state('');

	const handleSubmit = async () => {
		if (!newName.trim()) {
			error = 'Name cannot be empty';
			return;
		}

		if (newName.length > 30) {
			error = 'Name must be less than 30 characters';
			return;
		}

		if (newName === currentName) {
			error = 'Please enter a different name';
			return;
		}

		error = '';
		const success = await onSubmit(newName.trim());
		if (success) {
			open = false;
		} else {
			error = 'This name is already taken. Please try another.';
		}
	};

	// Reset form when dialog opens
	$effect(() => {
		if (open) {
			newName = currentName;
			error = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Change Username</Dialog.Title>
			<Dialog.Description>
				Enter a new username. It must be unique in this room.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-2">
				<Input
					bind:value={newName}
					placeholder="Enter new username"
					class={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
					disabled={isSubmitting}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !isSubmitting) {
							handleSubmit();
						}
					}}
				/>
				{#if error}
					<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={handleSubmit} disabled={isSubmitting}>
				{#if isSubmitting}
					Changing...
				{:else}
					Change Name
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
