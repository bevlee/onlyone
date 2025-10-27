<!-- <div -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import { loginSchema, signupSchema } from '$lib/schema';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import SignupForm from '$lib/components/auth/SignupForm.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import SuperDebug from 'sveltekit-superforms/SuperDebug.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	let {
		data
	}: {
		data: PageData;
	} = $props();

	let loginForm = superForm(data.loginForm, {
		validators: zodClient(loginSchema)
	});
	let signupForm = superForm(data.signupForm, {
		validators: zodClient(signupSchema)
	});
	let isLoading = $state(false);
</script>

<div class="space-y-4">
	<h2 class="text-xl font-semibold">Quick Play</h2>
	<form method="POST" action="?/anonymous">
		<Button
			type="submit"
			class="w-full bg-green-700 text-white hover:bg-green-800"
			disabled={isLoading}
		>
			{isLoading ? 'Creating guest session...' : 'Play as Guest'}
		</Button>
	</form>
	<p class="text-muted-foreground pb-5 text-center text-sm">
		We'll assign you a random name. Sign up to choose your own!
	</p>
</div>
<hr />
<div class="flex flex-col items-center justify-center pt-5">
	<Tabs.Root value="login" class="w-full">
		<Tabs.List class="mb-4">
			<Tabs.Trigger value="login" class="px-4 py-2">Login</Tabs.Trigger>
			<Tabs.Trigger value="signup" class="px-4 py-2">Sign Up</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="login" class="w-full max-w-md">
			<LoginForm form={loginForm} />
		</Tabs.Content>
		<Tabs.Content value="signup" class="w-full max-w-md">
			<SignupForm form={signupForm} />
		</Tabs.Content>
	</Tabs.Root>
</div>
<SuperDebug data={loginForm.form} />
<SuperDebug data={signupForm.form} />
