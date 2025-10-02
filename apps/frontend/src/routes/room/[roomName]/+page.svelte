<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userStore } from '$lib/stores/user.svelte.js';
	import { websocketStore } from '$lib/services/websocket.svelte.js';
	import { gameServerAPI, type Room } from '$lib/api/gameserver.js';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';

	let { data } = $props();
	const roomName = data.roomName;

	let room = $state<Room | null>(null);
	let isLoading = $state(true);
	let error = $state('');

	onMount(async () => {
		// If not already joined, join via HTTP first
		if (!data.alreadyJoined) {
			const joinResult = await gameServerAPI.joinRoom(roomName);

			if (!joinResult.success) {
				error = joinResult.error || 'Failed to join room';
				setTimeout(() => goto(resolve('/lobby')), 2000);
				return;
			}
		}

		// Setup websocket event handlers
		websocketStore.onRoomStateUpdate((updatedRoom) => {
			room = updatedRoom;
			isLoading = false;
		});

		websocketStore.onPlayerJoined((data) => {
			room = data.room;
			// Could show notification: "${data.player.name} joined"
		});

		websocketStore.onPlayerLeft((data) => {
			room = data.room;
			// Could show notification: "${data.player.name} left"
		});

		websocketStore.onError((errorMsg) => {
			error = errorMsg;
			// If connection error, redirect to lobby
			setTimeout(() => goto(resolve('/lobby')), 2000);
		});

		// Connect to websocket for real-time updates
		const playerId = userStore.state.user?.id || 'unknown';
		websocketStore.connect(roomName, userStore.state.displayName, playerId);
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

<RoomHeader {roomName} username={userStore.state.displayName} onLeaveRoom={handleLeaveRoom} />
<div class="container mx-auto px-4 py-8">
	{#if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
			{error}
		</div>
	{:else if isLoading}
		<div class="text-muted-foreground py-8 text-center">
			<p>Connecting to room...</p>
		</div>
	{:else if room}
		<div class="mx-auto max-w-4xl space-y-6">
			<PlayerList
				players={room.players}
				currentUser={userStore.state.displayName}
				roomLeader={room.roomLeader}
			/>

			<div class="text-muted-foreground">
				<p>Game Status: {room.status}</p>
				<p>Connected: {websocketStore.state.connected ? '✓' : '✗'}</p>
			</div>
		</div>
	{/if}
</div>
