<script lang="ts">
	// Log anti-cheat utk guru: siapa pindah tab/jendela atau mencoba buka tab
	// baru, berapa kali & kapan.
	import { page } from '$app/state';
	import { authApi } from '$lib/api';
	import { labelPelanggaran } from '$lib/anticheat';
	import { toFormError } from '$lib/form';
	import { toast } from '$lib/stores/toast';
	import type { PelanggaranListResponse } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';

	let loading = $state(true);
	let log = $state<PelanggaranListResponse | null>(null);

	const id = $derived(page.params.id ?? '');

	async function load() {
		if (!id) return;
		loading = true;
		try {
			log = await authApi.pelanggaranList(id);
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	function fmtWaktu(iso: string): string {
		try {
			return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		} catch {
			return iso;
		}
	}
	function fmtDurasi(ms: number): string {
		if (ms <= 0) return '—';
		const d = Math.round(ms / 100) / 10;
		return d < 60 ? `${d} dtk` : `${Math.round(d / 6)} mnt`;
	}
</script>

<svelte:head><title>Pelanggaran — KlikUjian</title></svelte:head>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat log…</p>
{:else if log && log.rows.length === 0}
	<Card>
		<p class="py-8 text-center text-sm text-slate-500">
			Belum ada pelanggaran tercatat pada ujian ini.
			{#if log.batas > 0}
				<span class="block text-xs text-slate-400">
					Sesi otomatis dikumpulkan setelah {log.batas}× pindah tab/jendela atau membuka tab baru.
				</span>
			{/if}
		</p>
	</Card>
{:else if log}
	<div class="mb-3 text-sm text-slate-600">
		{log.rows.length} peserta tercatat · auto-submit pada {log.batas > 0 ? `${log.batas}× pelanggaran` : 'tidak terbatas (hanya dicatat)'}
	</div>
	<div class="space-y-3">
		{#each log.rows as r (r.peserta_id)}
			<Card>
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<span class="text-sm font-semibold">{r.no_absen}. {r.nama}</span>
					<span class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
						{r.jumlah}× pelanggaran
					</span>
					{#if log.batas > 0 && r.jumlah >= log.batas}
						<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">melewati batas — auto-submit</span>
					{/if}
					<span class="ml-auto text-xs {r.status === 'mengerjakan' ? 'text-indigo-600' : 'text-slate-400'}">
						{r.status === 'mengerjakan' ? 'masih mengerjakan' : r.status === 'selesai' ? 'terkumpul' : 'waktu habis'}
					</span>
				</div>
				<ul class="space-y-1">
					{#each r.items as it, i (i)}
						<li class="flex items-center gap-3 text-xs text-slate-600">
							<span class="w-14 font-mono tabular-nums text-slate-400">{fmtWaktu(it.waktu)}</span>
							<span>{labelPelanggaran(it.jenis)}</span>
							{#if it.durasi_ms > 0}
								<span class="text-slate-500">lama <span class="font-medium text-slate-800">{fmtDurasi(it.durasi_ms)}</span></span>
							{/if}
							{#if it.no_soal_aktif > 0}
								<span class="text-slate-400">di nomor {it.no_soal_aktif}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</Card>
		{/each}
	</div>
{:else}
	<Card><p class="py-6 text-center text-sm text-slate-500">Log tidak bisa dimuat.</p></Card>
{/if}
