<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	const { joinRoom } = $props();
	let roomName = $state('testRoom');
	const submit = (e) => {
		e.preventDefault();
		joinRoom(roomName);
	};
</script>

<div class="flex flex-col items-center justify-center">
	<p class="my-6 text-lg leading-7">Please enter a room name to join:</p>

	<p class="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-gray-600 opacity-80">
		Note that room names are case sensitive
	</p>
	<form class="m-6 text-center" onsubmit={submit}>
		<Input bind:value={roomName} class="max-w-xs content-center" />
		<Button class="mt-6 bg-green-700 text-white hover:bg-green-800" type="submit">Join</Button>
	</form>
</div>
