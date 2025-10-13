<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { userSession } from '$lib/user.svelte';
	import { websocketStore } from '$lib/services/websocket.svelte.js';
	import { gameServerAPI, type Room } from '$lib/api/gameserver.js';
	import { setToastCookie } from '$lib/utils.js';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';

	let { data } = $props();
	const roomName = data.roomName;

	let room = $state<Room | null>(null);
	let isLoading = $state(true);

	onMount(async () => {
		// Check if user is authenticated, redirect to home if not
		if (!userSession.state.isAuthenticated) {
			goto(resolve('/'));
			return;
		}

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

		websocketStore.onPlayerKicked((data) => {
			const currentUserId = userSession.state.auth?.id;
			// If current user was kicked, redirect to lobby
			if (data.playerId === currentUserId) {
				const message = `You were kicked from the room. Reason: ${data.reason}`;
				setToastCookie(message);
				goto(resolve('/lobby'));
			}
			// Could show notification for other kicked players: "${data.playerName} was kicked"
		});

		websocketStore.onError((errorMsg) => {
			// If connection error, redirect to lobby with toast
			setToastCookie(errorMsg);
			goto(resolve('/lobby'));
		});

		// Connect to websocket for real-time updates
		const playerId = userSession.state.auth?.id || 'unknown';
		websocketStore.connect(roomName, userSession.state.displayName, playerId);
	});

	onDestroy(() => {
		// Cleanup websocket connection when leaving page
		websocketStore.disconnect();
	});

	function handleLeaveRoom() {
		websocketStore.disconnect();
		goto(resolve('/lobby'));
	}

	async function handleKickPlayer(playerId: string, playerName: string) {
		if (!confirm(`Are you sure you want to kick ${playerName}?`)) {
			return;
		}

		const result = await gameServerAPI.kickPlayer(roomName, playerId);

		if (!result.success) {
			const message = result.error || `Failed to kick player ${playerName}`;
			setToastCookie(message);
			goto(resolve('/lobby'));
		}
	}
</script>

<RoomHeader {roomName} username={userSession.state.displayName} onLeaveRoom={handleLeaveRoom} />
<div class="container mx-auto px-4 py-8">
	{#if isLoading}
		<div class="text-muted-foreground py-8 text-center">
			<p>Connecting to room...</p>
		</div>
	{:else if room}
		<div class="mx-auto max-w-4xl space-y-6">
			<PlayerList
				players={room.players}
				currentUser={userSession.state.displayName}
				currentUserId={userSession.state.auth?.id || ''}
				roomLeader={room.roomLeader}
				onKickPlayer={handleKickPlayer}
			/>

			<div class="text-muted-foreground">
				<p>Game Status: {room.status}</p>
				<p>Connected: {websocketStore.state.connected ? '✓' : '✗'}</p>
			</div>
		</div>
	{/if}
</div>
