<script lang="ts">
	// FR-6: rekap nilai per ujian + ringkasan statistik.
	import { page } from '$app/state';
	import { authApi, downloadExport } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { toast } from '$lib/stores/toast';
	import type { RekapResponse } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	let rekap = $state<RekapResponse | null>(null);
	let loading = $state(true);
	let hitungUlang = $state(false);
	let downloading = $state<'excel' | 'pdf' | null>(null);

	const id = $derived(page.params.id ?? '');

	async function unduh(format: 'excel' | 'pdf') {
		downloading = format;
		try {
			await downloadExport(id, format);
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			downloading = null;
		}
	}

	const statusIkutUjian = (s: string) => s === 'selesai' || s === 'waktu_habis';

	async function load() {
		if (!id) return;
		loading = true;
		try {
			rekap = await authApi.rekapNilai(id);
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	async function recalc() {
		hitungUlang = true;
		try {
			const r = await authApi.hitungNilai(id);
			toast.success(r.pesan);
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			hitungUlang = false;
		}
	}

	const belumDinilai = $derived(
		(rekap?.rows ?? []).filter((r) => !statusIkutUjian(r.status)).length
	);
</script>

<svelte:head><title>Rekap Nilai — KlikUjian</title></svelte:head>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat rekap…</p>
{:else if rekap}
	<!-- statistik -->
	<div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
		<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
			<p class="text-xs text-slate-500">Peserta ikut</p>
			<p class="text-lg font-semibold tabular-nums">{rekap.jumlah_selesai}/{rekap.jumlah_peserta}</p>
		</div>
		<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
			<p class="text-xs text-slate-500">Rata-rata</p>
			<p class="text-lg font-semibold tabular-nums">{rekap.jumlah_peserta ? rekap.rata_rata.toFixed(1) : '—'}</p>
		</div>
		<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
			<p class="text-xs text-slate-500">Tertinggi / Terendah</p>
			<p class="text-lg font-semibold tabular-nums">
				{rekap.jumlah_peserta ? `${rekap.tertinggi.toFixed(0)} / ${rekap.terendah.toFixed(0)}` : '—'}
			</p>
		</div>
		<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
			<p class="text-xs text-slate-500">Dihitung pada</p>
			<p class="text-sm font-medium leading-7">
				{rekap.dihitung_pada ? new Date(rekap.dihitung_pada).toLocaleString('id-ID') : 'belum ada nilai'}
			</p>
		</div>
	</div>

	{#if belumDinilai > 0 && rekap.dihitung_pada}
		<p class="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
			{belumDinilai} peserta belum mengumpulkan — nilainya dihitung dari jawaban terakhir yang autosimpan.
		</p>
	{:else if !rekap.dihitung_pada}
		<p class="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
			Belum ada nilai. Isi &amp; lengkapi kunci jawaban dulu, lalu tekan “Hitung Ulang”.
		</p>
	{/if}

	<Card>
		{#snippet actions()}
			<!-- snippet dikompilasi di luar blok {:else if rekap} -> pakai optional chain -->
			<Button variant="secondary" onclick={() => unduh('excel')} disabled={downloading !== null || !rekap?.rows.length}>
				{downloading === 'excel' ? 'Menyiapkan…' : 'Export Excel'}
			</Button>
			<Button variant="secondary" onclick={() => unduh('pdf')} disabled={downloading !== null || !rekap?.rows.length}>
				{downloading === 'pdf' ? 'Menyiapkan…' : 'Export PDF'}
			</Button>
			<Button variant="secondary" onclick={recalc} disabled={hitungUlang}>
				{hitungUlang ? 'Menghitung…' : 'Hitung Ulang'}
			</Button>
		{/snippet}

		{#if rekap.rows.length === 0}
			<p class="py-8 text-center text-sm text-slate-500">Belum ada peserta pada ujian ini.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
							<th class="py-2 pr-3 font-medium">No</th>
							<th class="py-2 pr-3 font-medium">Nama</th>
							<th class="py-2 pr-3 text-center font-medium" title="Benar">B</th>
							<th class="py-2 pr-3 text-center font-medium" title="Salah">S</th>
							<th class="py-2 pr-3 text-center font-medium" title="Kosong">K</th>
							<th class="py-2 pr-3 text-right font-medium">Skor</th>
							<th class="py-2 text-right font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each rekap.rows as r (r.peserta_id)}
							<tr class="border-b border-slate-100 last:border-0">
								<td class="py-2 pr-3 text-slate-500 tabular-nums">{r.no_absen}</td>
								<td class="py-2 pr-3 font-medium text-slate-900">{r.nama}</td>
								<td class="py-2 pr-3 text-center tabular-nums {r.jumlah_benar ? 'text-emerald-700' : 'text-slate-400'}">{r.jumlah_benar}</td>
								<td class="py-2 pr-3 text-center tabular-nums {r.jumlah_salah ? 'text-red-600' : 'text-slate-400'}">{r.jumlah_salah}</td>
								<td class="py-2 pr-3 text-center tabular-nums text-slate-400">{r.jumlah_kosong}</td>
								<td class="py-2 pr-3 text-right font-semibold tabular-nums {r.skor >= 75
										? 'text-emerald-700'
										: r.skor >= 50
											? 'text-slate-800'
											: 'text-red-600'}">
									{rekap.dihitung_pada ? r.skor.toFixed(1) : '—'}
								</td>
								<td class="py-2 text-right">
									{#if r.butuh_koreksi}
										<a
											href="/guru/ujian/{id}/koreksi"
											class="mr-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-200"
											title="Klik untuk menilai soal isian peserta ini"
										>
											perlu koreksi
										</a>
									{/if}
									<span class="rounded-full px-2 py-0.5 text-xs {r.status === 'selesai'
											? 'bg-emerald-100 text-emerald-700'
											: r.status === 'waktu_habis'
												? 'bg-amber-100 text-amber-700'
												: 'bg-red-50 text-red-600'}">
										{r.status === 'selesai'
											? 'Terkumpul'
											: r.status === 'waktu_habis'
												? 'Waktu habis'
												: 'Belum submit'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
{:else}
	<Card>
		<p class="py-6 text-center text-sm text-slate-500">Rekap tidak bisa dimuat.</p>
	</Card>
{/if}
