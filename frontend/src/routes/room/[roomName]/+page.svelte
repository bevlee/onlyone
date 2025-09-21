<script lang="ts">
	import { page } from '$app/stores';

	$: roomName = $page.params.roomName;
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-4">Room: {roomName}</h1>

	<div class="text-muted-foreground">
		<p>Room content will go here...</p>
	</div>
</div>