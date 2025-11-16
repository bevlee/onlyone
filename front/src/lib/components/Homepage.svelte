<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	interface HomepageProps {
		joinRoom: (roomName: string) => void;
	}

	const { joinRoom }: HomepageProps = $props();
	let roomName = $state('');
	const submit = (e) => {
		e.preventDefault();
		joinRoom(roomName);
	};
</script>

<div class="flex flex-col items-center justify-center">
	<p class="mt-6 text-lg leading-7">Please enter a room name to join:</p>

	<form class="m-6 text-center" onsubmit={submit}>
		<Input
			bind:value={roomName}
			autocapitalize="on"
			autocorrect="off"
			pattern="[A-Z0-9]+"
			title="Please enter a combination of Uppercase letters and numbers only"
			placeholder="Enter Room Name"
			maxlength={10}
			oninput={(e) => {
				// Remove special chars and convert to uppercase
				roomName = roomName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
			}}
			class="max-w-xs content-center"
		/>
		<Button
			class="mt-6 bg-green-700 text-white hover:bg-green-800"
			disabled={roomName === ''}
			type="submit">Join</Button
		>
	</form>
</div>
