<script lang="ts">
	import type { SuperForm } from 'sveltekit-superforms';
	import type { loginSchema } from '$lib/schema';
	import type { z } from 'zod';
	import { Field, Control, Label, Description, FieldErrors } from 'formsnap';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	let {
		form
	}: {
		form: SuperForm<z.infer<typeof loginSchema>>;
	} = $props();

	let { form: formData, enhance, message } = form;
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
