<script lang="ts">
	// Registrasi service worker PWA (virtual module vite-plugin-pwa).
	// vite.config.ts memakai registerType 'autoUpdate': SW baru mengambil alih
	// sendiri (skipWaiting+clientsClaim) saat user membuka app berikutnya —
	// halaman ujian yang sedang berjalan TIDAK pernah di-reload paksa. Banner
	// di bawah hanya memberi tahu "versi baru siap" dan opsional muat ulang.
	// Saat dev, devOptions.enabled=false -> tidak ada sw.js; stores tak pernah
	// true, jadi komponen ini tidak merender apa pun.
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

	const pesan = $derived(
		$needRefresh
			? 'Versi baru KlikUjian tersedia'
			: $offlineReady
				? 'Aplikasi siap dipakai offline'
				: ''
	);
</script>

{#if $needRefresh || $offlineReady}
	<div class="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl bg-slate-900 p-3 text-white shadow-lg" role="status">
		<p class="text-sm font-medium">{pesan}</p>
		<p class="mt-0.5 text-xs text-slate-300">
			{#if $needRefresh}
				Sedang ujian? Update juga terserap saat dibuka lagi.
			{:else}
				Buka lewat aplikasi (tambahkan ke layar utama) tanpa perlu koneksi untuk halaman ini.
			{/if}
		</p>
		<div class="mt-2 flex gap-2">
			{#if $needRefresh}
				<button
					type="button"
					onclick={() => updateServiceWorker(true)}
					class="rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-semibold hover:bg-indigo-400"
				>
					Muat ulang
				</button>
			{/if}
			<button
				type="button"
				onclick={() => {
					offlineReady.set(false);
					needRefresh.set(false);
				}}
				class="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
			>
				Nanti
			</button>
		</div>
	</div>
{/if}
