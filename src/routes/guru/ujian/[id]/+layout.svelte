<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { UjianLoad } from './+layout';
	import { statusClass, statusLabel } from '$lib/ujianMeta';
	import type { Ujian } from '$lib/types';

	let { children, data }: { children: Snippet; data: UjianLoad } = $props();
	const ujian = $derived(data.ujian as Ujian);

	const tabs = [
		{ seg: 'soal', label: 'Tipe Soal' },
		{ seg: 'kunci-jawaban', label: 'Kunci Jawaban' },
		{ seg: 'koreksi', label: 'Koreksi Isian' },
		{ seg: 'rekap-nilai', label: 'Rekap Nilai' },
		{ seg: 'realtime', label: 'Realtime' },
		{ seg: 'pelanggaran', label: 'Pelanggaran' },
	];
</script>

<div class="mb-4">
	<a href="/guru/ujian" class="text-sm text-slate-500 hover:text-indigo-600">← Semua ujian</a>
	<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
		<h1 class="text-lg font-semibold">{ujian.nama_ujian}</h1>
		<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusClass[ujian.status]}">
			{statusLabel[ujian.status]}
		</span>
		<p class="w-full text-sm text-slate-500">
			{ujian.nama_kelas}{#if ujian.mata_pelajaran} · {ujian.mata_pelajaran}{/if}
			· {ujian.jumlah_soal} soal · {ujian.durasi_menit} menit
			· peserta {ujian.jumlah_peserta} ({ujian.jumlah_selesai} selesai)
			<code class="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-indigo-700">{ujian.kode_akses}</code>
		</p>
	</div>
</div>

<div class="mb-4 flex flex-col gap-3 rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-100 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<p class="text-xs font-medium uppercase tracking-wide text-indigo-600">Akses untuk peserta</p>
		<div class="mt-1 flex items-center gap-2">
			<span class="text-sm text-slate-600">Kode akses:</span>
			<code class="rounded bg-white px-2.5 py-1 font-mono text-lg font-bold tracking-widest text-indigo-700 ring-1 ring-indigo-200">{ujian.kode_akses}</code>
		</div>
		<p class="mt-1 text-xs text-slate-500">Bagikan kode ini kepada siswa untuk mengikuti ujian.</p>
	</div>
	<a
		href={`/ujian/masuk?kode=${encodeURIComponent(ujian.kode_akses)}`}
		target="_blank"
		rel="noreferrer"
		class="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
	>
		Buka halaman masuk siswa →
	</a>
</div>

<nav class="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
	{#each tabs as t (t.seg)}
		{@const href = `/guru/ujian/${ujian.id}/${t.seg}`}
		<a
			href={href}
			class="flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm {page.url.pathname === href
				? 'border-indigo-600 font-medium text-indigo-700'
				: 'border-transparent text-slate-500 hover:text-slate-800'}"
		>
			{t.label}
			{#if t.seg === 'pelanggaran' && ujian.jumlah_pelanggaran > 0}
				<span class="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-orange-700">
					{ujian.jumlah_pelanggaran}
				</span>
			{/if}
		</a>
	{/each}
</nav>

{@render children()}
