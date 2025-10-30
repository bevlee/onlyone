<script lang="ts">
	import type { SuperForm } from 'sveltekit-superforms';
	import type { signupSchema } from '$lib/schema';
	import type { z } from 'zod';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { onMount } from 'svelte';
	let {
		form
	}: {
		form: SuperForm<z.infer<typeof signupSchema>>;
	} = $props();

	let debounceTimeout;
	let checkingName = $state(false);
	let nameExists = $state<boolean | null>(null);
	let { form: formData, allErrors, enhance, message } = form;

	let isFormValid = $derived.by(() => {
		return (
			!checkingName &&
			$formData.name &&
			$formData.email &&
			$formData.password &&
			nameExists === false &&
			$formData.password.length >= 6
		);
	});
	const checkNameAvailability = (name: string): void => {
		checkingName = true;
		// Simulate an API call to check name availability
		clearTimeout(debounceTimeout);

		if (!name) {
			nameExists = null;
			return;
		}

		debounceTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`http://localhost:3000/gameserver/auth/nameExists/${name}`);
				const data = await res.json();

				if (data.nameExists) {
					nameExists = data.nameExists;
					console.log(form);
				} else {
					nameExists = false;
				}
			} catch (error) {
				console.error('Error checking name availability:', error);
			}
		}, 500);
		checkingName = false;
	};

	onMount(() => {
		checkNameAvailability($formData.name);
	});
</script>

{#if $message}
	<span class="mb-2 text-emerald-400">
		{$message}
	</span>
{/if}

<form method="post" action="?/signup" use:enhance class="w-full space-y-2" autocomplete="off">
	<div>
		<Field {form} name="name">
			<Control>
				{#snippet children({ props })}
					<Label class="font-medium">Name</Label>
					<Input
						{...props}
						type="text"
						placeholder="Enter your name"
						bind:value={$formData.name}
						autocomplete="off"
						oninput={(e) => checkNameAvailability(e.target.value)}
					/>
					<Description class="text-muted-foreground text-xs"
						>This is your public name - It must be unique</Description
					>
					{#if $formData.name === ''}{:else if checkingName}
						<span class=" text-sm">Checking name availability...</span>
					{:else if nameExists}
						<span class="text-destructive text-sm"
							>{`The name ${$formData.name} is not available`}</span
						>
					{:else}
						<span class="text-sm text-emerald-700">{`The name ${$formData.name} is available`}</span
						>
					{/if}
				{/snippet}
			</Control>
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
		</Field>
	</div>

	{#if $allErrors.length}
		<ul class="text-destructive mb-4 text-sm">
			{#each $allErrors as error (error.messages)}
				<li>
					<b>{error.path}:</b>
					{error.messages.join('. ')}
				</li>
			{/each}
		</ul>
	{/if}

	<div>
		<Button size="sm" type="submit" disabled={!isFormValid}>Submit</Button>
	</div>
</form>
