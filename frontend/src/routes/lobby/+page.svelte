<!-- Lobby page - displays active rooms and allows joining -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import LobbyHeader from '$lib/components/LobbyHeader.svelte';
	import CreateRoomForm from '$lib/components/CreateRoomForm.svelte';
	import { gameServerAPI, type Room } from '$lib/api/gameserver.js';
	import { userStore } from '$lib/stores/user.svelte.js';
	import { goto } from '$app/navigation';

	let rooms = $state<Room[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let isCreating = $state(false);

	// Load rooms on mount and set up periodic refresh
	onMount(() => {
		loadRooms();
		// Refresh rooms every 5 seconds
		const interval = setInterval(loadRooms, 5000);
		return () => clearInterval(interval);
	});

	async function loadRooms() {
		const result = await gameServerAPI.getRooms();
		if (result.success && result.data) {
			rooms = result.data.rooms;
			error = '';
		} else {
			error = result.error || 'Failed to load rooms';
		}
		isLoading = false;
	}

	async function joinRoom(roomId: string) {
		const playerName = userStore.state.isAuthenticated ? undefined : userStore.state.displayName;
		const result = await gameServerAPI.joinRoom(roomId, playerName);

		if (result.success) {
			goto(`/room/${roomId}`);
		} else {
			error = result.error || 'Failed to join room';
		}
	}

	function handleCreateRoom(roomName: string) {
		isCreating = true;
		// TODO: Implement room creation when API is available
		console.log('Creating room:', roomName);
		setTimeout(() => {
			isCreating = false;
			// Refresh rooms list after creation
			loadRooms();
		}, 1000);
	}

	function getStatusText(status: Room['status']): string {
		switch (status) {
			case 'waiting': return 'Waiting for players';
			case 'playing': return 'Game in progress';
			default: return 'Unknown status';
		}
	}

	function getStatusColor(status: Room['status']): string {
		switch (status) {
			case 'waiting': return 'text-green-600';
			case 'playing': return 'text-yellow-600';
			default: return 'text-gray-500';
		}
	}
</script>

<LobbyHeader />
<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-2xl space-y-8">
		<!-- Create New Room -->
		<CreateRoomForm onCreateRoom={handleCreateRoom} disabled={isCreating} />

		<!-- Error Display -->
		{#if error}
			<div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
				{error}
			</div>
		{/if}

		<!-- Active Rooms -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">Active Rooms</h2>
				<Button variant="ghost" size="sm" onclick={loadRooms} disabled={isLoading}>
					{isLoading ? 'Loading...' : 'Refresh'}
				</Button>
			</div>

			{#if isLoading}
				<div class="text-center py-8 text-muted-foreground">
					<p>Loading rooms...</p>
				</div>
			{:else if rooms.length === 0}
				<div class="text-center py-8 text-muted-foreground">
					<p>No active rooms. Create one above!</p>
				</div>
			{:else}
				<!-- Scrolling Room List -->
				<div class="max-h-96 overflow-y-auto space-y-2 pr-2">
					{#each rooms as room (room.roomId)}
						<div class="bg-card text-card-foreground rounded-md border p-4 hover:bg-accent/50 transition-colors">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium">{room.roomId}</span>
										<span class="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
											{room.roomLeader}
										</span>
									</div>
									<div class="text-sm {getStatusColor(room.status)} mt-1">
										{getStatusText(room.status)}
									</div>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-sm text-muted-foreground">
										{room.playerCount}/{room.maxPlayers} players
									</span>
									<Button
										size="sm"
										class="bg-green-600 text-white hover:bg-green-700"
										onclick={() => joinRoom(room.roomId)}
										disabled={room.playerCount >= room.maxPlayers}
									>
										{room.playerCount >= room.maxPlayers ? 'Full' : 'Join'}
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
