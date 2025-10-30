<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Settings, User, LogOut } from 'lucide-svelte';
	import type { UserData } from '@onlyone/shared';

	type Props = {
		user: UserData | null;
	};

	const { user }: Props = $props();
	let name = $derived(user?.profile?.name);
	let menuOpen = $state(false);
</script>

<div
	class="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center justify-between border-b p-4 backdrop-blur"
>
	<div class="flex items-center gap-4">
		{#if name}
			<div class="flex items-center gap-2 text-sm">
				<User class="text-muted-foreground h-4 w-4" />
				<span class="font-medium">{name}</span>
			</div>
		{/if}
	</div>

	<div class="relative">
		<Button
			variant="ghost"
			size="icon"
			class="h-8 w-8"
			onclick={() => {
				menuOpen = !menuOpen;
			}}
		>
			<Settings class="h-4 w-4" />
		</Button>

		{#if menuOpen}
			<div class="bg-popover absolute right-0 z-50 mt-2 w-48 rounded-md border shadow-md">
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="hover:bg-accent flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm transition-colors"
						onclick={(e) => confirm(`Are you sure you want to logout?`) || e.preventDefault()}
					>
						<LogOut class="h-4 w-4" />
						Logout
					</button>
				</form>
				<form
					method="POST"
					action="/logout"
					onsubmit={() => console.log('logging out another one')}
				>
					<button
						type="submit"
						class="hover:bg-accent flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm transition-colors"
					>
						<LogOut class="h-4 w-4" />
						another one
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
