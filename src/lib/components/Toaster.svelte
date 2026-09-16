<script lang="ts">
	import { toast } from '$lib/stores/toast';
</script>

<div class="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
	{#each $toast as t (t.id)}
		<div
			class="pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-lg px-4 py-2.5 text-sm shadow-lg ring-1 {t.type ===
			'success'
				? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
				: 'bg-red-50 text-red-800 ring-red-200'}"
			role="status"
		>
			<span class="flex-1">{t.message}</span>
			<button type="button" class="opacity-60 hover:opacity-100" aria-label="Tutup" onclick={() => toast.dismiss(t.id)}>×</button>
		</div>
	{/each}
</div>
