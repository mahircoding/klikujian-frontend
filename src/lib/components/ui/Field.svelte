<script lang="ts">
	let {
		label,
		name,
		value = $bindable(''),
		type = 'text',
		placeholder = '',
		error = '',
		required = false,
		min,
		max,
		step,
		disabled = false,
		maxlength,
		pattern,
		inputmode,
		autocomplete,
	}: {
		label: string;
		name: string;
		value?: string;
		type?: string;
		placeholder?: string;
		error?: string;
		required?: boolean;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		maxlength?: number;
		pattern?: string;
		inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url' | 'none';
		autocomplete?: 'off' | 'on' | 'email' | 'username' | 'new-password';
	} = $props();

	// <label> membungkus <input>, jadi klik fokus & aksesibilitas terbawa tanpa id.
</script>

<label class="block">
	<span class="mb-1 flex text-sm font-medium text-slate-700">
		{label}
		{#if required}<span class="text-red-500">*</span>{/if}
	</span>
	<input
		{name}
		type={type}
		bind:value
		{placeholder}
		{min}
		{max}
		{step}
		{disabled}
		{maxlength}
		{pattern}
		{inputmode}
		{autocomplete}
		class="w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/40 {error
			? 'border-red-400 bg-red-50/40'
			: 'border-slate-300 bg-white'}"
	/>
	{#if error}<span class="mt-1 block text-xs text-red-600">{error}</span>{/if}
</label>
