<script lang="ts">
	import { page } from '$app/stores';
</script>

<nav class="border-b">
	<div class="container mx-auto px-4 py-3">
		<div class="flex items-center justify-between">
			<a href="/" class="text-xl font-bold">OnlyOne</a>

			<div class="flex items-center space-x-4">
				<a
					href="/"
					class="text-sm hover:text-primary transition-colors"
					class:text-primary={$page.url.pathname === '/'}
				>
					Home
				</a>
			</div>
		</div>
	</div>
</nav>