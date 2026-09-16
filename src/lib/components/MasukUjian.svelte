<script lang="ts">
	// Akses ujian (PRD 5.2 langkah 1-3) — dipakai sebagai halaman beranda "/"
	// sekaligus /ujian/masuk (deep link ?kode= tetap jalan). Nama/no_absen tidak
	// bisa diubah setelah sesi dibuat (keduanya = kunci resume sesi), jadi
	// dikonfirmasi di sini.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { pesertaApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import type { SoalInfo, UjianPublik } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';

	let kode = $state('');
	let ujian = $state<UjianPublik | null>(null);
	let soal = $state<SoalInfo[]>([]);
	let nama = $state('');
	let noAbsen = $state('1');

	let loading = $state(false);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	async function cariKode(e?: SubmitEvent) {
		e?.preventDefault();
		loading = true;
		formError = '';
		fieldErrors = {};
		try {
			const res = await pesertaApi.preview(kode);
			ujian = res.ujian;
			soal = res.soal ?? [];
		} catch (err) {
			const fe = toFormError(err);
			formError = fe.message;
			ujian = null;
			soal = [];
		} finally {
			loading = false;
		}
	}

	async function submitIdentitas(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		formError = '';
		fieldErrors = {};
		try {
			const sesi = await pesertaApi.masuk(kode.trim(), nama.trim(), Number(noAbsen));
			goto(`/ujian/kerjakan?sesi=${encodeURIComponent(sesi.token_sesi)}`);
		} catch (err) {
			const fe = toFormError(err);
			formError = fe.message;
			fieldErrors = fe.fields;
		} finally {
			loading = false;
		}
	}

	const opsiLabel = $derived.by(() => {
		if (!ujian) return '';
		if (soal.length && soal.some((s) => s.tipe !== soal[0].tipe)) {
			const pg = soal.filter((s) => s.tipe === 'pilihan_ganda').length;
			return `Campuran: ${pg} PG · ${soal.length - pg} isian`;
		}
		if (ujian.tipe_jawaban !== 'pilihan_ganda') return 'Isian singkat';
		return `Pilihan ganda A–${String.fromCharCode(64 + ujian.jumlah_opsi)}`;
	});

	// Link langsung ?kode=123456 (dari banner guru) — otomatis cek kode
	// (PRD: akses bisa berupa link berisi kode, bukan input manual saja).
	onMount(() => {
		const pre = page.url.searchParams.get('kode');
		if (pre && !kode) {
			kode = pre;
			void cariKode();
		}
	});
</script>

<div class="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center py-6">
	<div class="mb-5 text-center">
		<h1 class="text-xl font-bold text-indigo-700">KlikUjian</h1>
		<p class="mt-1 text-sm text-slate-500">Lembar Jawaban Digital</p>
	</div>

	{#if !ujian}
		<Card>
			<form onsubmit={cariKode} class="space-y-4">
				<Field
					label="Kode akses ujian"
					name="kode"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					maxlength={6}
					pattern="[0-9]{6}"
					bind:value={kode}
					placeholder="Contoh: 482910"
					error={fieldErrors.kode_akses}
					required
				/>
				<p class="text-xs text-slate-400">Kode 6 angka diberikan oleh guru, atau buka link yang dibagikan guru.</p>
				{#if formError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>
				{/if}
				<Button type="submit" disabled={loading || !kode.trim()} className="w-full">
					{loading ? 'Memeriksa…' : 'Lanjut'}
				</Button>
			</form>
		</Card>
	{:else}
		<Card>
			<div class="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
				<p class="font-semibold text-slate-900">{ujian.nama_ujian}</p>
				<p class="text-slate-500">{ujian.nama_kelas}{#if ujian.mata_pelajaran} · {ujian.mata_pelajaran}{/if}</p>
				<p class="mt-1 text-slate-600">
					{ujian.jumlah_soal} soal · {ujian.durasi_menit} menit · {opsiLabel}
				</p>
			</div>

			<form onsubmit={submitIdentitas} class="space-y-4">
				<Field label="Nama lengkap" name="nama" bind:value={nama} error={fieldErrors.nama} required />
				<Field
					label="Nomor absen"
					name="no_absen"
					type="number"
					bind:value={noAbsen}
					min={1}
					max={100}
					error={fieldErrors.no_absen}
					required
				/>
				<p class="text-xs text-slate-400">
					Pastikan data benar — nama dan nomor absen tidak bisa diubah setelah mulai.
				</p>
				{#if formError}
					<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>
				{/if}
				<div class="flex gap-2">
					<Button type="button" variant="secondary" onclick={() => (ujian = null)}>Ganti kode</Button>
					<Button type="submit" disabled={loading} className="flex-1">
						{loading ? 'Memproses…' : 'Mulai ujian'}
					</Button>
				</div>
			</form>
		</Card>
	{/if}

	<p class="mt-6 text-center text-xs text-slate-400">
		Guru / admin?
		<a href="/admin/login" class="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-indigo-600">
			Masuk panel guru
		</a>
	</p>
</div>
