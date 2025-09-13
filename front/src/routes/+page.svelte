<script lang="ts">
	import HomePage from '$lib/components/Homepage.svelte';
	import Room from '$lib/components/Room.svelte';

	let roomName: string = $state('');
	let roomSelected: boolean = $state(false);

	const joinRoom = (name: string) => {
		roomSelected = true;
		roomName = name;
	};
	const leaveRoom = () => {
		roomSelected = false;
		roomName = '';
	};
</script>

{#if !roomSelected}
	<HomePage {joinRoom} />
{:else}
	<Room {roomName} {leaveRoom} />
{/if}
