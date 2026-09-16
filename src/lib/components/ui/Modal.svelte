<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		title,
		children,
		footer,
		onclose,
	}: {
		open: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		onclose: () => void;
	} = $props();

	function onclickBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function onkeydown(e: KeyboardEvent) {
		// Hanya tanggap saat modal ini tampil — tiap halaman punya beberapa Modal
		// yang sama-sama register di window.
		if (open && e.key === 'Escape') onclose();
	}
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	role="dialog"
	aria-modal="true"
	aria-label={title}
	tabindex="-1"
	hidden={!open}
	onclick={onclickBackdrop}
	class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-900/40 p-4"
>
	<div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
		<header class="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
			<h2 class="text-base font-semibold text-slate-900">{title}</h2>
			<button
				type="button"
				onclick={onclose}
				class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
				aria-label="Tutup"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="size-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
			</button>
		</header>
		<div class="px-5 py-4">{@render children()}</div>
		{#if footer}
			<footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
				{@render footer()}
			</footer>
		{/if}
	</div>
</div>
