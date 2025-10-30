<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Settings, User, LogOut } from 'lucide-svelte';

	interface Props {
		roomName: string;
		name?: string;
		currentScene?: 'main' | 'endGame' | string;
		onChangeName?: () => void;
		onLeaveRoom?: () => void;
	}

	let { roomName, name = '', currentScene = 'main', onChangeName, onLeaveRoom }: Props = $props();

	// Show change name option during main game or end game scenes
	let showChangeName = $derived(currentScene === 'main' || currentScene === 'endGame');
</script>

<div
	class="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center justify-between border-b p-4 backdrop-blur"
>
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<div class="text-muted-foreground text-sm">
				Room: <span class="text-foreground font-medium">{roomName}</span>
			</div>
		</div>

		{#if name}
			<div class="bg-border h-4 w-px"></div>

			<div class="flex items-center gap-2 text-sm">
				<User class="text-muted-foreground h-4 w-4" />
				<span class="font-medium">{name}</span>
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
			{#if showChangeName && onChangeName}
				<DropdownMenu.Item onclick={onChangeName}>
					<User class="mr-2 h-4 w-4" />
					Change Name
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
			{/if}
			{#if onLeaveRoom}
				<DropdownMenu.Item onclick={onLeaveRoom}>
					<LogOut class="mr-2 h-4 w-4" />
					Leave Room
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
