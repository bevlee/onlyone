<script lang="ts">
	import type { SuperForm } from 'sveltekit-superforms';
	import type { loginSchema } from '$lib/schema';
	import type { z } from 'zod';
	import { Field, Control, Label } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	let {
		form
	}: {
		form: SuperForm<z.infer<typeof loginSchema>>;
	} = $props();

	let { form: formData, enhance, message, allErrors } = form;
	let isFormValid = $derived($formData.email && $formData.password);
</script>

{#if $message}
	<span class="mb-2 text-emerald-400">
		{$message}
	</span>
{/if}

<form method="post" action="?/login" use:enhance class="w-full space-y-2">
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
