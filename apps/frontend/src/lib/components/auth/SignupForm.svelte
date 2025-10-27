<script lang="ts">
	import type { SuperForm } from 'sveltekit-superforms';
	import type { signupSchema } from '$lib/schema';
	import type { z } from 'zod';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	let {
		form
	}: {
		form: SuperForm<z.infer<typeof signupSchema>>;
	} = $props();

	let debounceTimeout: NodeJS.Timeout;
	let checkingUsername = $state(false);
	let usernameExists = $state<boolean | null>(null);
	let { form: formData, errors, enhance, message } = form;

	const checkUsernameAvailability = (username: string): void => {
		checkingUsername = true;
		// Simulate an API call to check username availability
		clearTimeout(debounceTimeout);

		if (!username) {
			usernameExists = null;
			errors.username = 'Username must not be empty';
			return;
		}

		debounceTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`http://localhost:3000/gameserver/auth/usernameExists/${username}`);
				const data = await res.json();
				console.log('Username exists check:', data);
				if (data.usernameExists) {
					usernameExists = data.usernameExists;
					errors.username = 'Username must not be unique';
				} else {
					usernameExists = false;
				}
				checkingUsername = false;
			} catch (error) {
				console.error('Error checking username availability:', error);
				errors.username = 'Username must not be unique';
				checkingUsername = false;
			}
		}, 500);
	};
</script>

{#if $message}
	<span class="mb-2 text-emerald-400">
		{$message}
	</span>
{/if}

<form method="post" action="?/signup" use:enhance class="w-full space-y-2" autocomplete="off">
	<div>
		<Field {form} name="username">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">Username</Label>
					<Input
						{...props}
						type="text"
						placeholder="Enter your username"
						bind:value={$formData.username}
						autocomplete="off"
						oninput={(e) => checkUsernameAvailability(e.target.value)}
					/>
					<Description class="text-muted-foreground text-xs"
						>This is your public username</Description
					>
					{#if $formData.username === ''}{:else if checkingUsername}
						<span class=" text-sm">Checking username availability...</span>
					{:else if usernameExists}
						<span class="text-destructive text-sm"
							>{`The username ${$formData.username} is not available`}</span
						>
					{:else}
						<span class="text-sm text-emerald-400"
							>{`The username ${$formData.username} is available`}</span
						>
					{/if}
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>
	</div>

	<div>
		<Field {form} name="email">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">Email</Label>
					<Input
						{...props}
						type="email"
						placeholder="Enter your email"
						bind:value={$formData.email}
						autocomplete="off"
					/>
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>
	</div>

	<div>
		<Field {form} name="password">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">Password</Label>
					<Input
						{...props}
						type="password"
						placeholder="Enter your password"
						bind:value={$formData.password}
						autocomplete="off"
					/>
				{/snippet}
			</Control>
			<FieldErrors class="text-destructive text-sm" />
		</Field>
	</div>

	<div>
		<Button size="sm" type="submit">Submit</Button>
	</div>
</form>
