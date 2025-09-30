<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	interface Props {
		onCreateRoom?: (roomName: string) => void;
		disabled?: boolean;
	}

	let { onCreateRoom, disabled = false }: Props = $props();
	let newRoomName = $state('');

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (newRoomName.trim() && onCreateRoom) {
			onCreateRoom(newRoomName.trim());
			newRoomName = '';
		}
	};
</script>

<div class="space-y-4">
	<h2 class="text-xl font-semibold">Create New Room</h2>
	<form class="flex gap-2" onsubmit={handleSubmit}>
		<Input
			bind:value={newRoomName}
			placeholder="Room name..."
			class="flex-1"
			disabled={disabled}
		/>
		<Button
			type="submit"
			class="bg-blue-600 text-white hover:bg-blue-700"
			disabled={!newRoomName.trim() || disabled}
		>
			{disabled ? 'Creating...' : 'Create Room'}
		</Button>
	</form>
</div>