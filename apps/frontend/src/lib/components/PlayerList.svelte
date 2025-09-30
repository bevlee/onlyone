<script lang="ts">
	import UserIcon from 'lucide-svelte/icons/user';
	import UsersIcon from 'lucide-svelte/icons/users';
	import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
	import { slide } from 'svelte/transition';
	import type { RoomPlayer } from '@onlyone/shared';
	import { browser } from '$app/environment';

	let {
		players,
		currentUser,
		minPlayers = 3,
		roomLeader
	}: {
		players: RoomPlayer[];
		currentUser: string;
		minPlayers?: number;
		roomLeader: string | null;
	} = $props();

	const playerCount = $derived(players.length);
	const hasEnoughPlayers = $derived(playerCount >= minPlayers);

	// Initialize state
	const getInitialState = () => {
		if (!browser) return true;
		const saved = localStorage.getItem('playerListExpanded');
		// Default to expanded for first-time visitors (null), collapsed for returning users
		return saved === null ? true : saved === 'true';
	};

	let expanded = $state(getInitialState());

	const toggle = () => {
		expanded = !expanded;
		if (browser) {
			localStorage.setItem('playerListExpanded', expanded.toString());
		}
	};
</script>

<div class="bg-card rounded-lg border">
	<button
		class="hover:bg-accent/50 flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors"
		onclick={toggle}
	>
		<div class="text-muted-foreground flex items-center gap-2 text-sm font-medium">
			<UsersIcon class="h-4 w-4" />
			Players ({playerCount})
			{#if !hasEnoughPlayers}
				<span class="text-orange-600 dark:text-orange-400">
					(Need {minPlayers - playerCount} more)
				</span>
			{/if}
		</div>
		<ChevronDownIcon class={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
	</button>

	{#if expanded}
		<div transition:slide={{ duration: 200 }} class="px-4 pb-4">
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each players as player}
					<div class="bg-card text-card-foreground flex items-center gap-3 rounded-lg border p-3">
						<div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
							<UserIcon class="text-primary h-4 w-4" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium">
								{player.name}
								{#if player.name === currentUser}
									<span class="text-muted-foreground ml-1 text-xs">(you)</span>
								{/if}
								{#if roomLeader && player.name === roomLeader}
									<span class="text-yellow-600 dark:text-yellow-400 ml-1 text-xs">★</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>