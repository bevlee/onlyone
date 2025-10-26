<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let { data, form } = $props();
	console.log('FormData:', form);
	let name = $state(form?.name || '');
	let isUsernameUnique = $state(true);
	let checkingUsername = $state(false);

	let usernameClass = $derived.by(() => {
		if (checkingUsername) {
			return 'text-black-600';
		}
		return isUsernameUnique ? 'text-green-600' : 'text-red-600';
	});
	let showAuth = $state(false);
	let debounceTimer;
	// Auth form state
	let signupEmail = $state(form?.email || '');
	let loginEmail = $state(form?.email || '');
	let loginPassword = $state('');
	let signupPassword = $state('');
	let confirmPassword = $state('');
	let isSignup = $state(form?.signUp || false);
	let isLoading = $state(false);
	let error = $state('');
	let signupFailed = $derived(form?.status === 'failure');
	console.log(signupFailed);
	let returnTo: string | null = $derived(data.returnTo);

	let nameTooltip = $derived.by(() => {
		if (checkingUsername) {
			return 'Checking username...';
		} else
			return isUsernameUnique
				? `Username is available: ${name}`
				: `Username is not available: ${name}`;
	});

	function toggleAuth() {
		showAuth = !showAuth;
		error = '';
		signupEmail = '';
		confirmPassword = '';
	}

	function toggleSignup() {
		isSignup = !isSignup;
		error = '';
		confirmPassword = '';
	}

	function validatePasswords() {
		if (isSignup && signupPassword !== confirmPassword) {
			error = 'Passwords do not match';
			return false;
		}
		if (isSignup && !name.trim()) {
			error = 'Name is required for signup';
			return false;
		}
		return true;
	}

	async function isUsernameUniqueCheck(username: string): Promise<void> {
		try {
			const response = await fetch(
				`http://localhost:3000/gameserver/auth/usernameExists/${username}`
			);
			const data = await response.json();
			isUsernameUnique = !data.usernameExists;
		} catch (err) {
			console.error('Error checking username uniqueness:', err);
			isUsernameUnique = false;
		}
	}
	async function validateUsername(username: string): Promise<void> {
		checkingUsername = true;
		clearTimeout(debounceTimer);
		debounceTimer = await setTimeout(async () => {
			await isUsernameUniqueCheck(username);
			checkingUsername = false;
			console.log(
				isUsernameUnique ? 'Username is available' : 'Username is not available',
				username
			);
		}, 1000); // Check after 1000ms of no typing
	}

	function handleGoogleAuth() {
		error = 'Google OAuth is not yet implemented on the game server';
	}
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-6 text-3xl font-bold">Welcome to OnlyOne</h1>

	<div class="text-muted-foreground mb-8">
		<p>Real-time multiplayer word guessing game</p>
	</div>

	<div class="mx-auto max-w-md space-y-6">
		<!-- Guest Play -->
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
			<p class="text-muted-foreground text-center text-sm">
				We'll assign you a random name. Sign up to choose your own!
			</p>
		</div>
		<hr />
		<!-- Auth Form -->

		<div class="space-y-4 rounded-lg border p-4">
			<div class="flex items-center justify-between">
				<h3 class="font-semibold">{isSignup ? 'Create Account' : 'Login'}</h3>
				<Button variant="ghost" size="sm" onclick={toggleSignup}>
					{isSignup ? 'Have an account?' : 'Need an account?'}
				</Button>
			</div>

			{#if error}
				<div class="rounded border bg-red-50 p-2 text-sm text-red-600">
					{error}
				</div>
			{/if}

			<!-- Email/Password Form -->
			<form method="POST" action={isSignup ? '?/register' : '?/login'} class="space-y-3">
				<input type="hidden" name="returnTo" value={returnTo || ''} />
				{#if form?.error}
					<div class="rounded border bg-red-50 p-2 text-sm text-red-600">
						{form.error}
					</div>
				{/if}
				{#if isSignup}
					<Input
						name="name"
						bind:value={name}
						placeholder="Name"
						disabled={isLoading}
						required
						autocomplete="new-password"
						oninput={(e) => validateUsername(e.currentTarget.value)}
					/>

					<Input
						type="email"
						name="email"
						bind:value={signupEmail}
						placeholder="Email"
						disabled={isLoading}
						autocomplete="new-password"
						required
					/>

					<Input
						type="password"
						name="password"
						bind:value={signupPassword}
						placeholder="Password"
						autocomplete="new-password"
					/>
					<Input
						type="password"
						bind:value={confirmPassword}
						placeholder="Confirm Password"
						autocomplete="new-password"
						disabled={isLoading}
						required
					/>
					<div class="cursor-pointer font-semibold">
						Requirements
						<div class="mt-2 space-y-1 text-sm">
							<p class={usernameClass}>
								{nameTooltip}
							</p>
							<p class={signupPassword.length >= 6 ? 'text-green-600' : 'text-red-600'}>
								Password length must be at least 6 characters
							</p>
							<p class={signupPassword === confirmPassword ? 'text-green-600' : 'text-red-600'}>
								Passwords must match
							</p>
							<!-- more requirements -->
						</div>
					</div>
				{:else}
					<Input
						type="email"
						name="email"
						bind:value={loginEmail}
						placeholder="Email"
						disabled={isLoading}
						required
					/>

					<Input
						type="password"
						name="password"
						bind:value={loginPassword}
						placeholder="Password"
						disabled={isLoading}
						required
					/>
				{/if}

				<Button
					type="submit"
					class="w-full"
					disabled={isLoading}
					onclick={(e) => {
						if (!isUsernameUnique || !validatePasswords() || signupPassword.length < 6) {
							e.preventDefault();
							error = 'Please fix the errors before submitting.';
						}
					}}
				>
					{#if isLoading}
						{isSignup ? 'Creating Account...' : 'Logging in...'}
					{:else}
						{isSignup ? 'Create Account' : 'Login'}
					{/if}
				</Button>
			</form>

			<!-- OAuth -->
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<span class="w-full border-t"></span>
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-background text-muted-foreground px-2">Or continue with</span>
				</div>
			</div>

			<Button variant="outline" class="w-full" onclick={handleGoogleAuth} disabled={true}>
				{isLoading ? 'Redirecting...' : 'Continue with Google'}
			</Button>
		</div>
	</div>
</div>
