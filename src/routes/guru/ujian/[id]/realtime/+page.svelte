<script lang="ts">
	// Dashboard progres realtime (SSE): ikut masuk, jumlah nomor terisi, dan
	// submit tiap siswa — live tanpa refresh.
	import { page } from '$app/state';
	import { openProgressStream, type ProgressStream } from '$lib/realtime';
	import { formatCountdown } from '$lib/stores/sesi';
	import type { ProgressPayload, ProgressRow, Ujian } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';

	type ConnState = 'connecting' | 'open' | 'closed';

	let payload = $state<ProgressPayload | null>(null);
	let conn = $state<ConnState>('connecting');
	let nowTick = $state(0); // memicu hitung ulang countdown lokal tiap detik

	const id = $derived(page.params.id ?? '');
	const ujian = $derived(page.data.ujian as Ujian | undefined);
	const jumlahSoal = $derived(ujian?.jumlah_soal ?? 0);

	let stream: ProgressStream | null = null;
	$effect(() => {
		if (!id) return;
		stream = openProgressStream(
			id,
			(p) => (payload = p),
			(s) => (conn = s)
		);
		const t = setInterval(() => (nowTick = Date.now()), 1000);
		return () => {
			stream?.close();
			stream = null;
			clearInterval(t);
		};
	});

	const badge = $derived(
		conn === 'open'
			? { t: '● live', c: 'bg-emerald-100 text-emerald-700' }
			: conn === 'connecting'
				? { t: 'menyambungkan…', c: 'bg-amber-100 text-amber-700' }
				: { t: 'terputus', c: 'bg-red-100 text-red-700' }
	);

	const rows = $derived(payload?.rows ?? []);
	const selesai = $derived(payload?.jumlah_selesai ?? 0);
	const total = $derived(payload?.jumlah_peserta ?? 0);
	const pct = $derived(total ? Math.round((selesai / total) * 100) : 0);
	const batas = $derived(payload?.batas_pelanggaran ?? ujian?.batas_pelanggaran ?? 0);
	const totalPelanggaran = $derived(rows.reduce((a, r) => a + r.jumlah_pelanggaran, 0));

	// sisa waktu lokal: snapshot server di-offset jam device (sekadar tampilan)
	const deadlineBy = new Map<string, number>();
	function sisaLokal(r: ProgressRow): number {
		void nowTick;
		if (r.status !== 'mengerjakan') return 0;
		let dl = deadlineBy.get(r.peserta_id);
		if (dl === undefined || Math.abs(dl - (Date.now() + r.sisa_waktu * 1000)) > 1500) {
			dl = Date.now() + r.sisa_waktu * 1000;
			deadlineBy.set(r.peserta_id, dl);
		}
		return Math.max(0, Math.round((dl - Date.now()) / 1000));
	}
	function pctTerisi(r: ProgressRow): number {
		if (!jumlahSoal) return 0;
		return Math.round((r.jumlah_terisi / jumlahSoal) * 100);
	}
</script>

<svelte:head><title>Realtime — KlikUjian</title></svelte:head>

<div class="mb-4 flex items-center justify-between gap-3">
	<h1 class="text-lg font-semibold">Progres Pengerjaan</h1>
	<span class="rounded-full px-2.5 py-1 text-xs font-medium {badge.c}">{badge.t}</span>
</div>

{#if payload === null}
	<p class="py-10 text-center text-sm text-slate-500">
		{conn === 'closed' ? 'Koneksi terputus.' : 'Menyiapkan stream…'}
	</p>
{:else}
	<Card>
		<div class="mb-1 flex items-center justify-between text-sm">
			<span class="text-slate-500">Sudah dikumpulkan</span>
			<span class="font-semibold tabular-nums">{selesai} / {total}</span>
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-slate-100">
			<div class="h-full rounded-full bg-emerald-500 transition-all" style="width: {pct}%"></div>
		</div>
		{#if totalPelanggaran > 0}
			<p class="mt-2 flex items-center gap-1 text-xs text-orange-700">
				⚠ {totalPelanggaran} event pengawasan{batas > 0 ? ` (auto-submit pada ${batas}×)` : ''} —
				<a href="/guru/ujian/{id}/pelanggaran" class="underline hover:text-orange-900">lihat log</a>
			</p>
		{/if}
	</Card>

	{#if rows.length === 0}
		<p class="py-8 text-center text-sm text-slate-500">
			Belum ada peserta yang masuk. Bagikan kode akses
			{#if ujian}<code class="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-indigo-700">{ujian.kode_akses}</code>{/if}
			ke kelas.
		</p>
	{:else}
		<div class="mt-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
						<th class="py-2 pr-3 pl-4 font-medium">No</th>
						<th class="py-2 pr-3 font-medium">Nama</th>
						<th class="py-2 pr-4 font-medium">Progres</th>
						<th class="py-2 pr-4 font-medium">Sisa waktu</th>
						<th class="py-2 pr-4 text-center font-medium" title="Pelanggaran pengawasan tercatat (pindah tab/jendela, buka tab baru)">⚠</th>
						<th class="py-2 pr-4 text-right font-medium">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.peserta_id)}
						<tr class="border-b border-slate-100 last:border-0">
							<td class="py-2.5 pr-3 pl-4 text-slate-500 tabular-nums">{r.no_absen}</td>
							<td class="py-2.5 pr-3 font-medium text-slate-900">{r.nama}</td>
							<td class="py-2.5 pr-4">
								{#if r.status === 'mengerjakan'}
									<div class="flex items-center gap-2">
										<div class="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
											<div class="h-full rounded-full bg-indigo-400 transition-all" style="width: {pctTerisi(r)}%"></div>
										</div>
										<span class="text-xs text-slate-500 tabular-nums">
											{r.jumlah_terisi}{#if jumlahSoal}/{jumlahSoal}{/if}
										</span>
									</div>
								{:else}
									<span class="text-xs text-slate-400">{r.jumlah_terisi} terisi</span>
								{/if}
							</td>
							<td class="py-2.5 pr-4">
								{#if r.status === 'mengerjakan'}
									{@const sisa = sisaLokal(r)}
									<span class="font-mono text-xs tabular-nums {sisa <= 60
											? 'font-semibold text-red-600'
											: 'text-slate-600'}">
										{formatCountdown(sisa)}
									</span>
								{:else}
									<span class="text-xs text-slate-400">—</span>
								{/if}
							</td>
							<td class="py-2.5 pr-4 text-center">
								{#if r.jumlah_pelanggaran > 0}
								<span
									class="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums {batas > 0 && r.jumlah_pelanggaran >= batas
										? 'bg-red-100 text-red-700'
										: 'bg-orange-100 text-orange-700'}"
									title="Pelanggaran tercatat{batas > 0 ? ` — auto-submit pada ${batas}×` : ' — tanpa batas (hanya dicatat)'}"
								>
									{r.jumlah_pelanggaran}{#if batas > 0}/{batas}{/if}
								</span>
								{:else}
								<span class="text-xs text-slate-300">·</span>
								{/if}
							</td>
							<td class="py-2.5 pr-4 text-right">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {r.status === 'selesai'
										? 'bg-emerald-100 text-emerald-700'
										: r.status === 'waktu_habis'
											? 'bg-amber-100 text-amber-700'
											: 'bg-slate-100 text-slate-600'}">
									{r.status === 'selesai'
										? 'Terkumpul'
										: r.status === 'waktu_habis'
											? 'Waktu habis'
											: 'Mengerjakan'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/if}
