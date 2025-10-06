<!-- Lobby page - displays active rooms and allows joining -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import LobbyHeader from '$lib/components/LobbyHeader.svelte';
	import CreateRoomForm from '$lib/components/CreateRoomForm.svelte';
	import { gameServerAPI, type Room } from '$lib/api/gameserver.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from '$lib/utils.js';

	let { data } = $props();
	let rooms = $state<Room[]>(data.initialRooms || []);
	let isLoading = $state(false);
	let isCreating = $state(false);

	// Load rooms on mount and set up periodic refresh
	onMount(() => {
		// Show toast if there's a message from redirect
		if (data.toastMessage) {
			toast.error(data.toastMessage);
			// Clean URL by replacing current history entry
			window.history.replaceState({}, '', '/lobby');
		}

		// Refresh rooms every 5 seconds
		const interval = setInterval(loadRooms, 5000);
		return () => clearInterval(interval);
	});

	async function loadRooms() {
		const result = await gameServerAPI.getRooms();
		if (result.success && result.data) {
			rooms = result.data.rooms;
		} else {
			toast.error(result.error || 'Failed to load rooms');
		}
		isLoading = false;
	}

	async function joinRoom(roomName: string) {
		// Join via HTTP, then navigate
		const result = await gameServerAPI.joinRoom(roomName);

		if (result.success) {
			goto(resolve(`/room/${roomName}`));
		} else {
			toast.error(result.error || 'Failed to join room');
		}
	}

	async function handleCreateRoom(roomName: string) {
		isCreating = true;

		const createResult = await gameServerAPI.createRoom(roomName);

		if (!createResult.success) {
			toast.error(createResult.error || 'Failed to create room');
			isCreating = false;
			return;
		}

		// Automatically join the room we just created
		const joinResult = await gameServerAPI.joinRoom(roomName);

		if (joinResult.success) {
			goto(resolve(`/room/${roomName}`));
		} else {
			toast.error(joinResult.error || 'Failed to join room');
			isCreating = false;
		}
	}

	function getStatusText(status: Room['status']): string {
		switch (status) {
			case 'playing':
				return 'Game in progress';
			default:
				return 'Waiting for players';
		}
	}

	function getStatusColor(status: Room['status']): string {
		switch (status) {
			case 'playing':
				return 'text-yellow-600';
			default:
				return 'text-green-600';
		}
	}
</script>

<LobbyHeader />
<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-2xl space-y-8">
		<!-- Create New Room -->
		<CreateRoomForm onCreateRoom={handleCreateRoom} disabled={isCreating} />

		<!-- Active Rooms -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">Active Rooms</h2>
				<Button variant="ghost" size="sm" onclick={loadRooms} disabled={isLoading}>
					{isLoading ? 'Loading...' : 'Refresh'}
				</Button>
			</div>

			{#if isLoading}
				<div class="text-muted-foreground py-8 text-center">
					<p>Loading rooms...</p>
				</div>
			{:else if rooms.length === 0}
				<div class="text-muted-foreground py-8 text-center">
					<p>No active rooms. Create one above!</p>
				</div>
			{:else}
				<!-- Scrolling Room List -->
				<div class="max-h-96 space-y-2 overflow-y-auto pr-2">
					{#each rooms as room (room.roomName)}
						<div
							class="bg-card text-card-foreground hover:bg-accent/50 rounded-md border p-4 transition-colors"
						>
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<span class="font-medium">{room.roomName}</span>
									<div class="text-sm {getStatusColor(room.status)} mt-1">
										{getStatusText(room.status)}
									</div>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-muted-foreground text-sm">
										{room.players.length}/{room.settings.maxPlayers} players
									</span>
									<Button
										size="sm"
										class="bg-green-600 text-white hover:bg-green-700"
										onclick={() => joinRoom(room.roomName)}
										disabled={room.players.length >= room.settings.maxPlayers}
									>
										{room.players.length >= room.settings.maxPlayers ? 'Full' : 'Join'}
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
