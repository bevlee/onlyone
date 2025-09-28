<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { userStore } from "$lib/stores/user.svelte.js";
	import { goto } from "$app/navigation";

	let name = $state("");
	let showAuth = $state(false);

	// Auth form state
	let email = $state("");
	let password = $state("");
	let confirmPassword = $state("");
	let isSignup = $state(false);
	let isLoading = $state(false);
	let error = $state("");

	function handleSetName() {
		if (name.trim()) {
			userStore.setAnonymousName(name.trim());
			goto('/lobby');
		}
	}

	function toggleAuth() {
		showAuth = !showAuth;
		error = "";
		email = "";
		password = "";
		confirmPassword = "";
	}

	function toggleSignup() {
		isSignup = !isSignup;
		error = "";
		confirmPassword = "";
	}

	async function handleAuth() {
		if (isLoading) return;

		error = "";

		if (!email.trim() || !password.trim()) {
			error = "Email and password are required";
			return;
		}

		if (isSignup && password !== confirmPassword) {
			error = "Passwords do not match";
			return;
		}

		if (isSignup && !name.trim()) {
			error = "Name is required for signup";
			return;
		}

		isLoading = true;

		try {
			const result = isSignup
				? await userStore.register(name.trim(), email.trim(), password)
				: await userStore.login(email.trim(), password);

			if (!result.success) {
				error = result.error || 'Authentication failed';
				return;
			}

			goto('/lobby');
		} catch (err) {
			error = 'Network error. Please try again.';
			console.error('Auth error:', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleAuth() {
		// Note: Google OAuth will need to be implemented on the gameserver
		// For now, show a placeholder message
		error = "Google OAuth is not yet implemented on the game server";
	}
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold mb-6">Welcome to OnlyOne</h1>

	<div class="text-muted-foreground mb-8">
		<p>Real-time multiplayer word guessing game</p>
	</div>

	<div class="max-w-md mx-auto space-y-6">
		<!-- Anonymous Name Entry -->
		<div class="space-y-4">
			<h2 class="text-xl font-semibold">Quick Play</h2>
			<div class="flex gap-2">
				<Input
					bind:value={name}
					placeholder="Enter your name..."
					class="flex-1"
				/>
				<Button onclick={handleSetName} disabled={!name.trim()}>
					Play
				</Button>
			</div>
		</div>

		<!-- Auth Options -->
		<div class="text-center">
			<div class="text-sm text-muted-foreground mb-2">or</div>
			<Button variant="outline" onclick={toggleAuth}>
				{showAuth ? "Hide" : "Login / Sign Up"}
			</Button>
		</div>

		{#if showAuth}
			<div class="space-y-4 p-4 border rounded-lg">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold">{isSignup ? 'Create Account' : 'Login'}</h3>
					<Button variant="ghost" size="sm" onclick={toggleSignup}>
						{isSignup ? 'Have an account?' : 'Need an account?'}
					</Button>
				</div>

				{#if error}
					<div class="text-sm text-red-600 bg-red-50 p-2 rounded border">
						{error}
					</div>
				{/if}

				<!-- Email/Password Form -->
				<form class="space-y-3" onsubmit={(e) => { e.preventDefault(); handleAuth(); }}>
					{#if isSignup}
						<Input
							bind:value={name}
							placeholder="Name"
							disabled={isLoading}
							required
						/>
					{/if}

					<Input
						type="email"
						bind:value={email}
						placeholder="Email"
						disabled={isLoading}
						required
					/>

					<Input
						type="password"
						bind:value={password}
						placeholder="Password"
						disabled={isLoading}
						required
					/>

					{#if isSignup}
						<Input
							type="password"
							bind:value={confirmPassword}
							placeholder="Confirm Password"
							disabled={isLoading}
							required
						/>
					{/if}

					<Button
						type="submit"
						class="w-full"
						disabled={isLoading}
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
						<span class="bg-background px-2 text-muted-foreground">Or continue with</span>
					</div>
				</div>

				<Button
					variant="outline"
					class="w-full"
					onclick={handleGoogleAuth}
					disabled={isLoading}
				>
					{isLoading ? 'Redirecting...' : 'Continue with Google'}
				</Button>
			</div>
		{/if}
	</div>
</div>
