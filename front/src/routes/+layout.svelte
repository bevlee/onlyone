<script lang="ts">
	import '../app.css';
	 // Your custom store

    // document.body.className = `appBody`; // e.g., 'theme-dark'
 
	let { children } = $props();
</script>

{@render children()}