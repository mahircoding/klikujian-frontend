<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label = '',
		name,
		value = $bindable(''),
		error = '',
		required = false,
		disabled = false,
		children,
	}: {
		label?: string;
		name: string;
		value?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		children: Snippet;
	} = $props();
</script>

<label class="block">
	{#if label}
		<span class="mb-1 flex text-sm font-medium text-slate-700">
			{label}
			{#if required}<span class="text-red-500">*</span>{/if}
		</span>
	{/if}
	<select
		{name}
		bind:value
		{disabled}
		class="w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/40 {error
			? 'border-red-400 bg-red-50/40'
			: 'border-slate-300 bg-white'}"
	>
		{@render children()}
	</select>
	{#if error}<span class="mt-1 block text-xs text-red-600">{error}</span>{/if}
</label>
