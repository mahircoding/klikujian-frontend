<script lang="ts">
	// Tipe per nomor soal — hanya saat ujian masih draft (backend menegakkan).
	import { page } from '$app/state';
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { toast } from '$lib/stores/toast';
	import type { SoalInfo, TipeJawaban } from '$lib/types';

	let loading = $state(true);
	let items = $state<SoalInfo[]>([]);
	let status = $state('draft');
	let jumlahSoal = $state(0);
	let jumlahOpsi = $state(5);
	const tipeOptions: Array<[TipeJawaban, string]> = [
		['pilihan_ganda', 'PG'],
		['isian_singkat', 'Isian'],
	];

	const id = $derived(page.params.id ?? '');
	const editable = $derived(status === 'draft');

	async function load() {
		if (!id) return;
		loading = true;
		try {
			const res = await authApi.soalList(id);
			// Data lama/API tertentu dapat mengirim items=null; halaman tetap
			// harus memperlakukannya sebagai daftar kosong.
			items = Array.isArray(res?.items) ? res.items.filter((item): item is SoalInfo => item != null) : [];
			status = res.status;
			jumlahSoal = res.jumlah_soal;
			jumlahOpsi = items.find((i) => i.jumlah_opsi > 0)?.jumlah_opsi ?? 5;
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}
	$effect(() => {
		load();
	});

	async function setTipe(no: number, tipe: TipeJawaban) {
		try {
			// Backend membutuhkan jumlah_opsi 2–10 untuk pilihan ganda.
			// Untuk isian nilainya akan diabaikan dan di-set 0 oleh backend.
			await authApi.soalSetTipe(id, no, tipe, jumlahOpsi);
			items = items.map((it) => (it.no_soal === no ? { ...it, tipe } : it));
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}

	const pgCount = $derived(items.filter((i) => i.tipe === 'pilihan_ganda').length);
	const isianCount = $derived(items.length - pgCount);
</script>

<svelte:head><title>Tipe Soal — KlikUjian</title></svelte:head>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat…</p>
{:else}
	<div class="mb-4 rounded-lg bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
		<p class="text-slate-600">
			Satu ujian boleh mencampur <span class="font-medium">pilihan ganda</span> dan
			<span class="font-medium">isian singkat</span> per nomor. PG dinilai otomatis dengan kunci
			jawaban; isian singkat <span class="font-medium">dinilai manual oleh guru</span> (tidak otomatis).
		</p>
		{#if !editable}
			<p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-200">
				Ujian sudah {status} — tipe soal tidak bisa diubah lagi karena siswa mungkin sudah menjawab.
			</p>
		{/if}
	</div>

	<div class="mb-3 flex flex-wrap items-center gap-3">
		<p class="text-sm text-slate-500">
			{jumlahSoal} nomor · {pgCount} PG · {isianCount} isian
		</p>
		{#if editable}
			<div class="ml-auto flex gap-2">
				<button
					type="button"
					class="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
					onclick={async () => {
						for (const it of items) if (it.tipe !== 'pilihan_ganda') await setTipe(it.no_soal, 'pilihan_ganda');
						await load();
					}}
				>Semua PG</button>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		{#each items as it (it.no_soal)}
			<div class="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
				<span class="text-sm font-semibold text-slate-700">Nomor {it.no_soal}</span>
				{#if editable}
					<div class="flex gap-1">
							{#each tipeOptions as option (option[0])}
								{@const tipe = option[0]}
								{@const label = option[1]}
								<button
								type="button"
								onclick={() => setTipe(it.no_soal, tipe as TipeJawaban)}
								class="rounded-md px-2.5 py-1 text-xs font-medium {it.tipe === tipe
									? 'bg-indigo-600 text-white'
									: 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
							>{label}</button>
						{/each}
					</div>
				{:else}
					<span class="rounded-full px-2 py-0.5 text-xs font-medium {it.tipe === 'pilihan_ganda'
						? 'bg-indigo-50 text-indigo-700'
						: 'bg-emerald-50 text-emerald-700'}">
						{it.tipe === 'pilihan_ganda' ? `PG (A–${String.fromCharCode(64 + it.jumlah_opsi)})` : 'Isian · dinilai manual'}
					</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}
