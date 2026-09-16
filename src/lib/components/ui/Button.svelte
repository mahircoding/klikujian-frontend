<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		variant = 'primary',
		type = 'button',
		disabled = false,
		onclick,
		className = '',
	}: {
		children: Snippet;
		variant?: 'primary' | 'secondary' | 'danger';
		type?: 'button' | 'submit';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		className?: string;
	} = $props();

	const base =
		'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';
	const variants: Record<string, string> = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
		secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
		danger: 'bg-red-600 text-white hover:bg-red-700',
	};
</script>

<button {type} {disabled} class="{base} {variants[variant]} {className}" {onclick}>
	{@render children()}
</button>
