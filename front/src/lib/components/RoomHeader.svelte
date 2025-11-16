<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	interface RoomHeaderProps {
		roomName: string;
		username: string;
		currentScene: string;
		onChangeName: () => void;
		onLeaveRoom: () => void;
	}

	let { roomName, username, currentScene, onChangeName, onLeaveRoom }: RoomHeaderProps = $props();
</script>

<div
	class="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center justify-between border-b p-4 backdrop-blur"
>
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<div class="text-muted-foreground text-sm">
				Room: <span data-testid="roomHeader-roomCode" class="text-foreground font-medium"
					>{roomName}</span
				>
			</div>
		</div>

		<div class="bg-border h-4 w-px"></div>

		<div class="flex items-center gap-2 text-sm">
			<UserIcon class="text-muted-foreground h-4 w-4" />
			<span data-testid="roomHeader-username" class="font-medium">{username}</span>
		</div>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="">
			<Button variant="ghost" size="icon" class="h-8 w-8">
				<SettingsIcon class="h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="">
			{#if currentScene === 'main' || currentScene === 'endGame'}
				<DropdownMenu.Item onclick={onChangeName} class="">
					<UserIcon class="mr-2 h-4 w-4" />
					Change Name
				</DropdownMenu.Item>
				<DropdownMenu.Separator class="" />
			{/if}
			<DropdownMenu.Item onclick={onLeaveRoom} class="">
				<LogOutIcon class="mr-2 h-4 w-4" />
				Leave Room
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
