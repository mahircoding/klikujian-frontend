<script lang="ts">
	// Koreksi manual soal isian singkat — guru membuka jawaban peserta per nomor
	// lalu memberi poin 0..1 (0 = dinilai tapi kosong betul, beda dgn belum dinilai).
	import { page } from '$app/state';
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { toast } from '$lib/stores/toast';
	import type { KoreksiListResponse, KoreksiPeserta, KoreksiPesertaRingkas } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let loading = $state(true);
	let list = $state<KoreksiListResponse | null>(null);
	let aktif = $state<KoreksiPeserta | null>(null);
	let open = $state(false);
	let saving = $state(false);
	/** salinan yang bisa diedit: nomor -> string poin ('' = belum diisi) */
	let poin = $state<Record<number, string>>({});

	const id = $derived(page.params.id ?? '');

	async function load() {
		if (!id) return;
		loading = true;
		try {
			const res = await authApi.koreksiList(id);
			list = { ...res, rows: Array.isArray(res?.rows) ? res.rows : [] };
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	async function buka(row: KoreksiPesertaRingkas) {
		try {
			aktif = await authApi.koreksiGet(id, row.peserta_id);
			poin = {};
			for (const it of aktif.items) {
				poin[it.no_soal] = it.terkoreksi ? String(it.poin) : '';
			}
			open = true;
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}

	// pratinjau cepat: klik 0 / 0.5 / 1
	function quick(no: number, val: string) {
		poin[no] = val;
	}

	const terisi = $derived(Object.values(poin).filter((v) => v.trim() !== '').length);

	async function simpan() {
		if (!aktif) return;
		saving = true;
		try {
			const items = aktif.items
				.filter((it) => poin[it.no_soal].trim() !== '')
				.map((it) => ({ no_soal: it.no_soal, poin: Math.min(1, Math.max(0, Number(poin[it.no_soal]))) }));
			await authApi.koreksiSave(id, aktif.peserta_id, items);
			toast.success('Koreksi tersimpan — skor peserta diperbarui.');
			open = false;
			aktif = null;
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Koreksi Isian — KlikUjian</title></svelte:head>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat…</p>
{:else if !list || list.jumlah_isian === 0}
	<Card>
		<p class="py-6 text-center text-sm text-slate-500">
			Ujian ini tidak punya soal isian singkat — semua nomor dinilai otomatis dari kunci jawaban.
		</p>
	</Card>
{:else}
	<div class="mb-3 text-sm text-slate-500">
		{list.jumlah_isian} nomor isian per peserta · {list.rows.filter((r) => !r.belum_selesai).length}/{list.rows.length} peserta selesai dikoreksi
	</div>

	{#if list.rows.length === 0}
		<Card><p class="py-6 text-center text-sm text-slate-500">Belum ada peserta.</p></Card>
	{:else}
		<div class="space-y-2">
			{#each list.rows as r (r.peserta_id)}
				<Card>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium text-slate-900">{r.no_absen}. {r.nama}</p>
							<p class="text-xs text-slate-500">
								{r.sudah_dinilai}/{r.jumlah_isian} isian dinilai
								{#if r.status === 'mengerjakan'}· belum submit{/if}
							</p>
						</div>
						<div class="flex items-center gap-2">
							{#if r.belum_selesai}
								<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">perlu koreksi</span>
							{:else}
								<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">selesai</span>
							{/if}
							<Button variant="secondary" onclick={() => buka(r)}>Koreksi</Button>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
{/if}

<Modal {open} onclose={() => (open = false)} title={aktif ? `Koreksi — ${aktif.nama}` : 'Koreksi'}>
	{#if aktif}
		<p class="mb-3 text-sm text-slate-500">
			Beri poin 0–1 per nomor. Poin 0 berarti <span class="font-medium">sudah dinilai tapi salah</span>;
			diisi = sudah, tidak diisi = belum dinilai.
		</p>
		<div class="space-y-3">
			{#each aktif.items as it (it.no_soal)}
				<div class="rounded-lg border border-slate-200 p-3">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-semibold">Nomor {it.no_soal}</span>
						{#if it.terkoreksi}
							<span class="text-xs text-emerald-600">tersimpan: {it.poin}</span>
						{:else}
							<span class="text-xs text-slate-400">belum dinilai</span>
						{/if}
					</div>
					{#if it.jawaban}
						<p class="mb-2 rounded bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">{it.jawaban}</p>
					{:else}
						<p class="mb-2 rounded bg-slate-50 px-2.5 py-1.5 text-sm italic text-slate-400">(kosong)</p>
					{/if}
					<div class="flex items-center gap-2">
						{#each ['0', '0.5', '1'] as q (q)}
							<button type="button" onclick={() => quick(it.no_soal, q)}
								class="rounded-md px-3 py-1.5 text-xs font-medium {poin[it.no_soal] === q
									? 'bg-indigo-600 text-white'
									: 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
								{q}
							</button>
						{/each}
						<input
							type="number" min="0" max="1" step="0.1"
							bind:value={poin[it.no_soal]}
							placeholder="poin…"
							class="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
						/>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-4 flex justify-end gap-2">
			<Button variant="secondary" onclick={() => (open = false)}>Batal</Button>
			<Button onclick={simpan} disabled={saving || terisi === 0}>
				{saving ? 'Menyimpan…' : `Simpan (${terisi}/${aktif.items.length})`}
			</Button>
		</div>
	{/if}
</Modal>
