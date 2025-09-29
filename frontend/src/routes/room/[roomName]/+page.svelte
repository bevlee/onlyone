<script lang="ts">
	import { page } from '$app/stores';
	import RoomHeader from '$lib/components/RoomHeader.svelte';

	$: roomName = $page.params.roomName;
</script>

<RoomHeader {roomName} username="Player123" />
<div class="container mx-auto px-4 py-8">
	<div class="text-muted-foreground">
		<p>Room content will go here...</p>
	</div>
</div>