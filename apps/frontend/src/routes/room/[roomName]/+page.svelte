<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { websocketStore } from '$lib/services/websocket.svelte.js';
	import { gameServerAPI } from '$lib/api/gameserver.js';
	import { setToastCookie } from '$lib/utils.js';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';

	let { data } = $props();
	const roomName = data.roomName;
	const user = $derived(data.user); // User data from SSR
	const kickedPlayerId = websocketStore.state.kickedPlayerId;

	onMount(async () => {
		// If not already joined, join via HTTP first
		if (!data.alreadyJoined) {
			const joinResult = await gameServerAPI.joinRoom(roomName);

			if (!joinResult.success) {
				const message = joinResult.error || 'Failed to join room';
				setToastCookie(message);
				goto(resolve('/lobby'));
				return;
			}
		}

		// Connect to websocket for real-time updates
		const playerId = user?.auth?.id || 'unknown';
		const displayName = user?.profile?.name || 'Unknown';
		websocketStore.connect(roomName, displayName, playerId);
	});

	$effect(() => {
		if (kickedPlayerId && kickedPlayerId === user?.auth?.id) {
			setToastCookie('You have been kicked from the room');
			goto(resolve('/lobby'));
		}
	});

	onDestroy(() => {
		// Cleanup websocket connection when leaving page
		websocketStore.disconnect();
	});

	function handleLeaveRoom() {
		websocketStore.disconnect();
		goto(resolve('/lobby'));
	}
</script>

<RoomHeader {roomName} name={user?.profile?.name || 'Unknown'} onLeaveRoom={handleLeaveRoom} />
<div class="container mx-auto px-4 py-8">
	{#if !websocketStore.state.room}
		<div class="text-muted-foreground py-8 text-center">
			<p>Connecting to room...</p>
		</div>
	{:else}
		<div class="mx-auto max-w-4xl space-y-6">
			<PlayerList
				players={websocketStore.state.room.players}
				currentUser={user?.profile?.name || 'Unknown'}
				currentUserId={user?.auth?.id || ''}
				roomLeader={websocketStore.state.room.roomLeader}
			/>
		</div>
	{/if}
</div>
