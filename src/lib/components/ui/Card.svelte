<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title = '', children, actions }: { title?: string; children: Snippet; actions?: Snippet } = $props();
</script>

<section class="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
	{#if title || actions}
		<header class="mb-4 flex items-center justify-between gap-3">
			{#if title}<h2 class="text-base font-semibold text-slate-900">{title}</h2>{/if}
			{#if actions}<div class="flex gap-2">{@render actions()}</div>{/if}
		</header>
	{/if}
	{@render children()}
</section>
