<script lang="ts">
	// FR-4 (disesuaikan): guru mengisi kunci utk nomor PG saja. Nomor isian
	// singkat tidak butuh kunci — diniai manual di tab Koreksi. Save = bulk
	// upsert nomor PG yang terisi; lengkap = semua nomor PG terkunci -> backend
	// otomatis hitung nilai.
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { toast } from '$lib/stores/toast';
	import type { KunciItemDTO } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { page } from '$app/state';

	let loading = $state(true);
	let saving = $state(false);
	let items = $state<KunciItemDTO[]>([]);

	const id = $derived(page.params.id ?? '');

	async function load() {
		if (!id) return;
		loading = true;
		try {
			const k = await authApi.kunciGet(id);
			items = k.items;
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	const pg = $derived(items.filter((i) => i.tipe === 'pilihan_ganda'));
	const isian = $derived(items.filter((i) => i.tipe !== 'pilihan_ganda'));
	const pgTerisi = $derived(pg.filter((i) => i.jawaban_benar.trim() !== '').length);
	const isLengkap = $derived(pg.length > 0 ? pgTerisi === pg.length : isian.length > 0);
	const missing = $derived(pg.filter((i) => !i.jawaban_benar.trim()).map((i) => i.no_soal));

	function opsiOf(it: KunciItemDTO): string[] {
		return Array.from({ length: it.jumlah_opsi || 5 }, (_, i) => String.fromCharCode(65 + i));
	}
	function pilih(noSoal: number, huruf: string) {
		items = items.map((it) =>
			it.no_soal === noSoal
				? { ...it, jawaban_benar: it.jawaban_benar === huruf ? '' : huruf }
				: it
		);
	}

	async function save() {
		saving = true;
		try {
			const payload = pg
				.map((it) => ({ no_soal: it.no_soal, jawaban_benar: it.jawaban_benar.trim() }))
				.filter((x) => x.jawaban_benar !== '');
			if (payload.length === 0) {
				toast.error('Belum ada kunci PG yang diisi.');
				return;
			}
			const res = await authApi.kunciSave(id, payload);
			toast.success(
				res.lengkap
					? res.nilai_dihitung
						? 'Kunci lengkap — nilai PG otomatis dihitung.'
						: 'Kunci lengkap.'
					: `Tersimpan. Masih ${pg.length - payload.length} nomor PG kosong.`
			);
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			saving = false;
		}
	}

	async function autoIsi(mode: 'a' | 'rotasi') {
		items = items.map((it) => {
			if (it.tipe !== 'pilihan_ganda') return it;
			const ops = opsiOf(it);
			return { ...it, jawaban_benar: mode === 'a' ? 'A' : ops[(it.no_soal - 1) % ops.length] };
		});
	}

	async function hitungUlang() {
		saving = true;
		try {
			const r = await authApi.hitungNilai(id);
			toast.success(r.pesan + ` (${r.jumlah_dinilai} peserta)`);
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Kunci Jawaban — KlikUjian</title></svelte:head>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat kunci…</p>
{:else}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="text-sm text-slate-600">
				Kunci hanya utk <span class="font-medium">{pg.length} nomor PG</span>.
				{#if isian.length}
					{isian.length} nomor isian <a href="/guru/ujian/{id}/koreksi" class="text-indigo-600 underline">dinilai manual →</a>
				{/if}
			</p>
			<p class="text-xs {isLengkap ? 'text-emerald-600' : 'text-amber-600'}">
				{pgTerisi}/{pg.length} kunci PG terisi
				{#if !isLengkap && missing.length}· kosong: {missing.slice(0, 12).join(', ')}{#if missing.length > 12}…{/if}{/if}
			</p>
		</div>
		<div class="flex gap-2">
			{#if pg.length}
				<Button variant="secondary" onclick={() => autoIsi('a')}>Isi semua A</Button>
				<Button variant="secondary" onclick={() => autoIsi('rotasi')}>Rotasi</Button>
			{/if}
			<Button variant="secondary" onclick={hitungUlang} disabled={!isLengkap || saving}>
				Hitung Ulang
			</Button>
			<Button onclick={save} disabled={saving || pgTerisi === 0}>
				{saving ? 'Menyimpan…' : 'Simpan Kunci'}
			</Button>
		</div>
	</div>

	<Card>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each items as it (it.no_soal)}
				<div class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 {it.tipe !== 'pilihan_ganda'
						? 'bg-slate-50/60'
						: ''}">
					<span class="w-10 shrink-0 text-sm font-semibold text-slate-700">No. {it.no_soal}</span>

					{#if it.tipe === 'pilihan_ganda'}
						<div class="flex flex-wrap justify-end gap-1.5">
							{#each opsiOf(it) as o (o)}
								<button
									type="button"
									onclick={() => pilih(it.no_soal, o)}
									class="size-8 rounded-md border text-sm font-semibold transition-colors {it.jawaban_benar === o
										? 'border-indigo-600 bg-indigo-600 text-white'
										: 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}"
								>{o}</button>
							{/each}
						</div>
					{:else}
						<span class="text-xs italic text-slate-400">isian — tanpa kunci</span>
					{/if}
				</div>
			{/each}
		</div>
	</Card>
{/if}
