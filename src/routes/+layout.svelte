<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import Navbar from '$lib/components/Navbar.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	// Mendaftarkan service worker PWA (hanya efektif pada build produksi).
	import PwaUpdate from '$lib/components/PwaUpdate.svelte';

	let { children } = $props();

	// Publik: beranda "/" (akses ujian siswa), "/ujian/*" (masuk & pengerjaan),
	// dan "/admin/login" (login guru/admin). Selain itu butuh sesi.
	const path = $derived(page.url.pathname);
	const isPublic = $derived(
		path === '/' ||
		path.startsWith('/ujian') ||
		path === '/admin/login'
	);

	onMount(() => {
		auth.restore();
	});

	// Guard: halaman admin/guru butuh sesi valid. Token sudah diverifikasi
	// /auth/me (restore()), jadi 401 otomatis menghapus token -> redirect.
	$effect(() => {
		if (isPublic) return;
		if ($auth.loading) return;
		if (!$auth.user) goto('/admin/login', { replaceState: true });
	});
</script>

<svelte:head><title>KlikUjian</title></svelte:head>

<div class="min-h-dvh bg-slate-50 text-slate-900">
	{#if !isPublic}
		<Navbar />
	{/if}

	<main class="mx-auto max-w-5xl px-4 py-6">
		{#if isPublic || $auth.user || $auth.loading}
			{@render children()}
		{/if}
	</main>
</div>

<Toaster />
<PwaUpdate />
