<script lang="ts">
	// Form create/edit ujian (PRD FR-2). Field mengikuti dto.UjianRequest.
	import { authApi } from '$lib/api';
	import type { FormError } from '$lib/form';
	import type { Kelas, TipeJawaban, Ujian, UjianInput } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let {
		open = $bindable(false),
		editing = null,
		save,
	}: {
		open?: boolean;
		editing?: Ujian | null;
		save: (input: UjianInput) => Promise<FormError | null>;
	} = $props();

	let kelasList = $state<Kelas[]>([]);
	let kelas_id = $state('');
	let nama_ujian = $state('');
	let mata_pelajaran = $state('');
	let jumlah_soal = $state('40');
	let durasi_menit = $state('90');
	let tipe_jawaban = $state<TipeJawaban>('pilihan_ganda');
	let jumlah_opsi = $state('5');
	let tanggal_ujian = $state('');
	let batas_pelanggaran = $state('3');

	let submitting = $state(false);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	// Reset / isi form setiap modal dibuka.
	$effect(() => {
		if (!open) return;
		formError = '';
		fieldErrors = {};
		if (editing) {
			kelas_id = editing.kelas_id;
			nama_ujian = editing.nama_ujian;
			mata_pelajaran = editing.mata_pelajaran ?? '';
			jumlah_soal = String(editing.jumlah_soal);
			durasi_menit = String(editing.durasi_menit);
			tipe_jawaban = editing.tipe_jawaban;
			jumlah_opsi = String(editing.jumlah_opsi);
			tanggal_ujian = editing.tanggal_ujian ?? '';
			batas_pelanggaran = String(editing.batas_pelanggaran ?? 3);
		} else {
			kelas_id = kelasList[0]?.id ?? '';
			nama_ujian = '';
			mata_pelajaran = '';
			jumlah_soal = '40';
			durasi_menit = '90';
			tipe_jawaban = 'pilihan_ganda';
			jumlah_opsi = '5';
			tanggal_ujian = '';
			batas_pelanggaran = '3';
		}
	});

	$effect(() => {
		authApi.kelasList().then((k) => {
			kelasList = k;
			if (!kelas_id) kelas_id = k[0]?.id ?? '';
		});
	});

	const isPG = $derived(tipe_jawaban === 'pilihan_ganda');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		formError = '';
		fieldErrors = {};
		try {
			const input: UjianInput = {
				kelas_id,
				nama_ujian: nama_ujian.trim(),
				mata_pelajaran: mata_pelajaran.trim() || null,
				jumlah_soal: Number(jumlah_soal),
				durasi_menit: Number(durasi_menit),
				tipe_jawaban,
				jumlah_opsi: isPG ? Number(jumlah_opsi) : 0,
				tanggal_ujian: tanggal_ujian || null,
				batas_pelanggaran: Number(batas_pelanggaran),
			};
			const err = await save(input);
			if (err) {
				formError = err.message;
				fieldErrors = err.fields;
			}
		} finally {
			submitting = false;
		}
	}
</script>

<Modal {open} onclose={() => (open = false)} title={editing ? 'Edit Ujian' : 'Buat Ujian'}>
	<form onsubmit={submit} class="space-y-4">
		{#if kelasList.length === 0}
			<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
				Belum ada kelas. Minta admin membuat kelas terlebih dahulu di menu Kelas.
			</p>
		{/if}

		<Select label="Kelas" name="kelas_id" bind:value={kelas_id} error={fieldErrors.kelasId} required>
			<option value="" disabled>Pilih kelas…</option>
			{#each kelasList as k (k.id)}
				<option value={k.id}>{k.nama_kelas}</option>
			{/each}
		</Select>

		<Field label="Nama ujian" name="nama_ujian" bind:value={nama_ujian} error={fieldErrors.namaUjian} required placeholder="UT Fisika Semester 1" />

		<Field label="Mata pelajaran" name="mata_pelajaran" bind:value={mata_pelajaran} error={fieldErrors.mataPelajaran} placeholder="Fisika" />

		<div class="grid grid-cols-2 gap-3">
			<Field
				label="Jumlah soal"
				name="jumlah_soal"
				type="number"
				bind:value={jumlah_soal}
				min={1}
				max={200}
				error={fieldErrors.jumlahSoal}
				required
			/>
			<Field
				label="Durasi (menit)"
				name="durasi_menit"
				type="number"
				bind:value={durasi_menit}
				min={1}
				error={fieldErrors.durasiMenit}
				required
			/>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<Select label="Tipe jawaban (default)" name="tipe_jawaban" bind:value={tipe_jawaban} error={fieldErrors.tipeJawaban}>
				<option value="pilihan_ganda">Pilihan ganda</option>
				<option value="isian_singkat">Isian singkat</option>
			</Select>
			{#if isPG}
				<Select label="Jumlah opsi" name="jumlah_opsi" bind:value={jumlah_opsi} error={fieldErrors.jumlahOpsi}>
					{#each [2, 3, 4, 5] as n (n)}
						<option value={String(n)}>{'A-' + String.fromCharCode(64 + n)}</option>
					{/each}
				</Select>
			{:else}
				<div class="self-end pb-2 text-xs text-slate-400">Bisa diubah per nomor di tab “Tipe Soal” saat draft.</div>
			{/if}
		</div>

		<Field label="Tanggal ujian" name="tanggal_ujian" type="date" bind:value={tanggal_ujian} error={fieldErrors.tanggalUjian} />

		<Select label="Auto-submit setelah keluar tab" name="batas_pelanggaran" bind:value={batas_pelanggaran}
			error={fieldErrors.batasPelanggaran}>
			<option value="3">3× (disarankan)</option>
			<option value="2">2×</option>
			<option value="5">5×</option>
			<option value="0">Tanpa batas (hanya dicatat)</option>
		</Select>
		<p class="-mt-2 text-xs text-slate-400">
			Pindah tab/jendela > 1,5 detik dihitung 1×. Jawaban tetap tersimpan saat ujian ditutup otomatis.
		</p>

		{#if formError}
			<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<Button variant="secondary" onclick={() => (open = false)}>Batal</Button>
			<Button type="submit" disabled={submitting || !kelas_id}>
				{submitting ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Buat ujian'}
			</Button>
		</div>
	</form>
</Modal>
