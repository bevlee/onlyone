<script lang="ts">
	import UserIcon from '@lucide/svelte/icons/user';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { SvelteSet } from 'svelte/reactivity';

	let {
		players,
		currentUser,
		minPlayers = 3
	}: {
		players: SvelteSet<string>;
		currentUser: string;
		minPlayers?: number;
	} = $props();

	const playersArray = $derived(Array.from(players.keys()));
	const playerCount = $derived(playersArray.length);
	const hasEnoughPlayers = $derived(playerCount >= minPlayers);
</script>

<div class="space-y-3">
	<div class="trunacted text-muted-foreground flex items-center gap-2 text-sm font-medium">
		<UsersIcon class="h-4 w-4" />
		Players ({playerCount})
		{#if !hasEnoughPlayers}
			<span class="text-orange-600 dark:text-orange-400">
				(Need {minPlayers - playerCount} more)
			</span>
		{/if}
	</div>

	<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each playersArray as player}
			<div class="bg-card text-card-foreground flex items-center gap-3 rounded-lg border p-3">
				<div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
					<UserIcon class="text-primary h-4 w-4" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="text-sm font-medium">
						{player}
						{#if player === currentUser}
							<span class="text-muted-foreground ml-1 text-xs">(you)</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
