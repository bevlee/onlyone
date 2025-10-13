<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Settings, User, LogOut } from 'lucide-svelte';
	import { userSession } from '$lib/user.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const { user } = $props();
	console.log('LobbyHeader user', user);
	const handleLogout = async () => {
		await userSession.signOut();
		// Optionally redirect after logout
		goto(resolve('/'));
	};

	let username = $derived(user.profile.name);
</script>

<div
	class="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center justify-between border-b p-4 backdrop-blur"
>
	<div class="flex items-center gap-4">
		{#if username}
			<div class="flex items-center gap-2 text-sm">
				<User class="text-muted-foreground h-4 w-4" />
				<span class="font-medium">{username}</span>
			</div>
		{/if}
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button variant="ghost" size="icon" class="h-8 w-8">
				<Settings class="h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onclick={handleLogout}>
				<LogOut class="mr-2 h-4 w-4" />
				Logout
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
