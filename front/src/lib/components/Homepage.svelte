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
	<p class="my-6 leading-7">Please enter the room you want to join:</p>

	<form class="m-6 text-center" onsubmit={submit}>
		<Input bind:value={roomName} class="max-w-xs content-center" />
		<Button class="mt-6 bg-green-700 text-white hover:bg-green-800" type="submit">Join</Button>
	</form>
</div>
