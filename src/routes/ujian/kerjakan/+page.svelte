<script lang="ts">
	// PRD 5.2 langkah 4-9. Semua keputusan waktu divalidasi ulang oleh server;
	// halaman ini hanya MENAMPILKAN countdown dari sisa_waktu yang dikirim server.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { pesertaApi } from '$lib/api';
	import { watchPelanggaran, labelPelanggaran, type PelanggaranEvent } from '$lib/anticheat';
	import { ApiError, type Sesi } from '$lib/types';
	import { deadlineLocalMs, formatCountdown } from '$lib/stores/sesi';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let sesi = $state<Sesi | null>(null);
	let jawaban = $state<Record<number, string>>({});
	let statusSimpan = $state<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});

	let deadlineMs = $state(0);
	let sisa = $state(0);
	let loading = $state(true);
	let fatal = $state('');

	let showKonfirmasi = $state(false);
	let submitting = $state(false);
	let hasilSubmit = $state<{ pesan: string; jumlah_terjawab: number } | null>(null);
	let offline = $state(false);

	// Anti-cheat: overlay peringatan besar saat siswa kembali ke halaman
	// (atau saat mencoba buka tab baru — muncul seketika), auto-clear.
	let teguran = $state('');
	let teguranTimer: ReturnType<typeof setTimeout> | undefined;
	let jumlahPelanggaran = $state(0);
	let batasPelanggaran = $state(3);
	let soalAktif = $state(0); // nomor terakhir yang disentuh utk laporan

	/** timer debounce per nomor — supaya mengubah no. 5 tidak membatalkan save no. 3 */
	const timers = new Map<number, ReturnType<typeof setTimeout>>();
	/** nomor yang gagal simpan, dicoba lagi saat submit/berikutnya */
	const pending = new Set<number>();

	let token = $derived(page.url.searchParams.get('sesi') ?? '');
	const aktif = $derived(sesi?.status === 'mengerjakan' && !hasilSubmit);
	const jumlahSoal = $derived(sesi?.ujian.jumlah_soal ?? 0);

	/** opsi huruf per nomor; [] utk nomor isian (dari sesi.soal, fallback tipe ujian) */
	function opsiUntuk(no: number): string[] {
		const u = sesi?.ujian;
		if (!u) return [];
		const info = sesi?.soal?.find((s) => s.no_soal === no);
		const tipe = info?.tipe ?? u.tipe_jawaban;
		const opsi = info?.jumlah_opsi || u.jumlah_opsi;
		if (tipe !== 'pilihan_ganda') return [];
		return Array.from({ length: Math.max(0, opsi) }, (_, i) => String.fromCharCode(65 + i));
	}
	const terjawab = $derived(Object.values(jawaban).filter((v) => v.trim() !== '').length);

	// ---- load sesi -------------------------------------------------------
	async function load() {
		if (!token) {
			fatal = 'Sesi tidak ditemukan. Silakan masuk dengan kode akses.';
			loading = false;
			return;
		}
		try {
			const s = await pesertaApi.status(token);
			sesi = s;
			jawaban = {};
			for (const j of s.jawaban) if (j.jawaban) jawaban[j.no_soal] = j.jawaban;
			deadlineMs = deadlineLocalMs(s.sisa_waktu);
			sisa = s.sisa_waktu;
			jumlahPelanggaran = s.jumlah_pelanggaran;
			batasPelanggaran = s.batas_pelanggaran;
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				fatal = 'Sesi ujian tidak dikenali. Masuk ulang dengan kode akses.';
			} else if (err instanceof ApiError && err.status === 409) {
				// Waktu habis menurut server: tandai, form jadi read-only.
				if (sesi) sesi.status = 'waktu_habis';
				hasilSubmit = { pesan: err.message, jumlah_terjawab: terjawab };
			} else {
				fatal = err instanceof ApiError ? err.message : 'Gagal memuat sesi.';
			}
		} finally {
			loading = false;
		}
	}

	// ---- timer -----------------------------------------------------------
	function tick() {
		if (!sesi) return;
		const next = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
		if (next === sisa) return;
		sisa = next;
		if (next === 0 && aktif) autoSubmit();
	}

	async function autoSubmit() {
		if (submitting || hasilSubmit) return;
		await flushPending();
		await doSubmit(true);
	}

	// ---- autosave --------------------------------------------------------
	function onInput(noSoal: number, val: string) {
		if (!aktif) return;
		soalAktif = noSoal;
		jawaban[noSoal] = val;
		const prev = timers.get(noSoal);
		if (prev) clearTimeout(prev);
		timers.set(
			noSoal,
			setTimeout(() => {
				timers.delete(noSoal);
				simpan(noSoal, val);
			}, 500)
		);
	}

	async function simpan(noSoal: number, val: string) {
		if (!token) return;
		statusSimpan[noSoal] = 'saving';
		try {
			await pesertaApi.simpanJawaban(token, noSoal, val);
			statusSimpan[noSoal] = 'saved';
			pending.delete(noSoal);
			offline = false;
		} catch (err) {
			// Sesi/ujian ditutup server (403) atau waktu habis (409):
			// jangan spam retry, tampilkan keadaannya.
			if (err instanceof ApiError && (err.status === 403 || err.status === 409)) {
				statusSimpan[noSoal] = 'idle';
				if (err.status === 409 && sesi) {
					sesi.status = 'waktu_habis';
					hasilSubmit = { pesan: err.message, jumlah_terjawab: terjawab };
				} else {
					fatal = err.message;
				}
				return;
			}
			statusSimpan[noSoal] = 'error';
			pending.add(noSoal);
			offline = err instanceof ApiError && err.status === 0;
		}
	}

	/** Kirim ulang nomor yang gagal autosave (dipanggil sebelum submit). */
	async function flushPending() {
		const list = [...pending];
		pending.clear();
		await Promise.all(list.map((n) => simpan(n, jawaban[n] ?? '')));
	}

	// ---- anti-cheat: lapor pelanggaran (pindah tab / jendela / coba buka tab)
	let lastAttemptAt = 0; // anti dobel-hukuman: attempt + pindah tab berikutnya = 1 event

	function tampilkanTeguran(pesan: string) {
		teguran = pesan;
		clearTimeout(teguranTimer);
		teguranTimer = setTimeout(() => (teguran = ''), 15000);
	}

	async function laporPelanggaran(e: PelanggaranEvent) {
		if (e.jenis === 'buka_tab') {
			// Peringatan muncul SEKETIKA, sebelum/lepas dari request: siswa harus
			// langsung sadar tindakannya tercatat meski browser sempat buka tab baru.
			lastAttemptAt = Date.now();
			tampilkanTeguran(
				'Membuka tab/jendela baru terdeteksi dan tercatat sebagai pelanggaran pengawasan.'
			);
		} else if (Date.now() - lastAttemptAt < 10000) {
			// Lanjutan dari percobaan buka tab yang sudah dihitung — jangan penalti dua kali.
			return;
		}
		try {
			const r = await pesertaApi.laporPelanggaran(token, e.jenis, e.durasiMS, e.noSoalAktif);
			jumlahPelanggaran = r.jumlah_pelanggaran;
			if (r.auto_submitted) {
				// Sesi ditutup server: flush jawaban terakhir lalu tampilkan layar selesai.
				await flushPending();
				hasilSubmit = { pesan: r.pesan, jumlah_terjawab: terjawab };
				if (sesi) sesi.status = 'selesai';
				teguran = '';
				return;
			}
			if (r.pesan) tampilkanTeguran(`${labelPelanggaran(e.jenis)} — ${r.pesan}`);
		} catch {
			// koneksi putus: event hilang — sesi tidak terpenalti, tapi siswa tetap terlihat aktif
		}
	}

	// ---- submit ----------------------------------------------------------
	async function doSubmit(timeout = false) {
		if (submitting) return;
		submitting = true;
		try {
			const res = await pesertaApi.submit(token, timeout);
			hasilSubmit = { pesan: res.pesan, jumlah_terjawab: res.jumlah_terjawab };
			if (sesi) sesi.status = res.status;
			showKonfirmasi = false;
		} catch (err) {
			if (err instanceof ApiError && err.status === 409) {
				// Waktu habis menurut server: tutup form, jawaban tetap tersimpan.
				hasilSubmit = { pesan: err.message, jumlah_terjawab: terjawab };
				if (sesi) sesi.status = 'waktu_habis';
				showKonfirmasi = false;
			} else {
				fatal = err instanceof ApiError ? err.message : 'Gagal mengumpulkan jawaban.';
			}
		} finally {
			submitting = false;
		}
	}

	async function submitManual() {
		await flushPending();
		await doSubmit(false);
	}

	function masukUlang() {
		goto('/ujian/masuk');
	}

	$effect(() => {
		if (token) load();
	});

	onMount(() => {
		const iv = setInterval(tick, 1000);
		// Heartbeat 30s: re-sync sisa_waktu + jumlah pelanggaran dari server (anti
		// clock drift, dan menutup form bila sesi ditutup dari sisi server).
		const hb = setInterval(() => {
			if (aktif && !submitting) pesertaApi.status(token).then((s) => {
				sisa = s.sisa_waktu;
				deadlineMs = deadlineLocalMs(s.sisa_waktu);
				jumlahPelanggaran = s.jumlah_pelanggaran;
				batasPelanggaran = s.batas_pelanggaran;
				if (s.status !== 'mengerjakan' && sesi) {
					sesi.status = s.status;
					hasilSubmit = { pesan: 'Sesi ditutup oleh sistem.', jumlah_terjawab: terjawab };
				}
			}).catch(() => {});
		}, 30000);

		// Detektor pelanggaran (anti-cheat): pindah tab/jendela/aplikasi lain,
		// atau coba buka tab/jendela baru. Lapor ke server; server yang mencatat,
		// menegur, dan auto-submit saat batas terlampaui.
		const watcher = watchPelanggaran({
			isLive: () => aktif && !submitting,
			activeQuestion: () => soalAktif,
			onPelanggaran: (e) => void laporPelanggaran(e),
		});

		// Jangan biarkan reload saat ujian belum terkumpul tanpa konfirmasi.
		const beforeUnload = (e: BeforeUnloadEvent) => {
			if (aktif && !hasilSubmit) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', beforeUnload);

		return () => {
			clearInterval(iv);
			clearInterval(hb);
			window.removeEventListener('beforeunload', beforeUnload);
			watcher.stop();
			clearTimeout(teguranTimer);
			timers.forEach((t) => clearTimeout(t));
		};
	});
</script>

<svelte:head><title>{sesi ? sesi.ujian.nama_ujian : 'Kerjakan Ujian'} — KlikUjian</title></svelte:head>

{#if loading}
	<p class="py-16 text-center text-sm text-slate-500">Memuat sesi ujian…</p>
{:else if fatal && !sesi}
	<div class="mx-auto max-w-md py-16 text-center">
		<p class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{fatal}</p>
		<Button onclick={masukUlang}>Masuk dengan kode akses</Button>
	</div>
{:else if sesi}
	<div class="pb-24">
		<!-- Header: identitas + timer sticky -->
		<div class="sticky top-0 z-30 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
			<div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-slate-900">{sesi.ujian.nama_ujian}</p>
					<p class="truncate text-xs text-slate-500">{sesi.nama} · Absen {sesi.no_absen} · {sesi.ujian.nama_kelas}</p>
				</div>
				<div class="flex items-center gap-3">
					{#if jumlahPelanggaran > 0 && aktif}
						<span
							class="rounded-full px-2 py-0.5 text-xs font-semibold {batasPelanggaran > 0 && jumlahPelanggaran >= batasPelanggaran - 1
								? 'bg-red-100 text-red-700'
								: 'bg-orange-100 text-orange-700'}"
							title="Pengawasan: pindah tab/jendela tercatat. Setelah {batasPelanggaran || '∞'}× ujian dikumpulkan otomatis."
						>
							⚠ pengawasan {jumlahPelanggaran}{#if batasPelanggaran > 0}/{batasPelanggaran}{/if}
						</span>
					{/if}
					{#if offline}
						<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
							tidak ada koneksi
						</span>
					{/if}
					{#if aktif}
						<span
							class="rounded-lg px-2.5 py-1 font-mono text-sm font-bold tabular-nums {sisa <= 60
								? 'bg-red-100 text-red-700'
								: sisa <= 300
									? 'bg-amber-100 text-amber-700'
									: 'bg-slate-100 text-slate-700'}"
							title="Sisa waktu (dihitung server)"
						>
							⏱ {formatCountdown(sisa)}
						</span>
					{:else if hasilSubmit}
						<span class="rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-700">
							{sesi.status === 'selesai' ? 'Terkumpul' : sesi.status === 'waktu_habis' ? 'Waktu habis' : 'Selesai'}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Layar setelah submit -->
		{#if hasilSubmit}
			<div class="mx-auto max-w-md py-10 text-center">
				<div class="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
				<h2 class="text-lg font-semibold text-slate-900">
					{sesi.status === 'selesai' ? 'Jawaban terkumpul' : 'Ujian ditutup'}
				</h2>
				<p class="mt-1 text-sm text-slate-600">{hasilSubmit.pesan}</p>
				<p class="mt-4 text-sm text-slate-500">
					{hasilSubmit.jumlah_terjawab} dari {jumlahSoal} nomor terjawab.
				</p>
				<div class="mt-6">
					<Button variant="secondary" onclick={masukUlang}>Selesai</Button>
				</div>
			</div>
		{:else}
			{#if fatal}
				<p class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{fatal}</p>
			{:else if !aktif}
				<p class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
					{sesi.status === 'waktu_habis'
						? 'Waktu ujian sudah habis. Jawaban terakhir Anda sudah tersimpan server.'
						: 'Sesi ini sudah ditutup.'}
				</p>
			{/if}

			<!-- Ringkasan progres -->
			<div class="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
				<div class="flex items-center justify-between text-sm">
					<span class="text-slate-500">Sudah diisi</span>
					<span class="font-semibold">{terjawab} / {jumlahSoal}</span>
				</div>
				<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
					<div
						class="h-full rounded-full bg-indigo-500 transition-all"
						style="width: {jumlahSoal ? Math.round((terjawab / jumlahSoal) * 100) : 0}%"
					></div>
				</div>
			</div>

			<!-- Daftar soal -->
			<div class="space-y-3">
				{#each { length: jumlahSoal } as _, i}
					{@const no = i + 1}
					{@const val = jawaban[no] ?? ''}
					{@const opsiNo = opsiUntuk(no)}
					<div
						class="rounded-xl bg-white p-4 shadow-sm ring-1 {statusSimpan[no] === 'error'
							? 'ring-red-300'
							: 'ring-slate-200'}"
						id="soal-{no}"
					>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-semibold text-slate-900">
								<span class="mr-1 inline-grid size-6 place-items-center rounded-full bg-indigo-50 text-xs text-indigo-700">{no}</span>
								Nomor {no}
							</span>
							<span class="text-xs {statusSimpan[no] === 'error'
									? 'text-red-600'
									: statusSimpan[no] === 'saving'
										? 'text-slate-400'
										: statusSimpan[no] === 'saved'
											? 'text-emerald-600'
											: 'text-transparent'}">
								{statusSimpan[no] === 'error'
									? 'gagal simpan — dicoba lagi'
									: statusSimpan[no] === 'saving'
										? 'menyimpan…'
										: statusSimpan[no] === 'saved'
											? 'tersimpan'
											: '·'}
							</span>
						</div>

						{#if opsiNo.length}
							<div class="flex flex-wrap gap-2">
								{#each opsiNo as o (o)}
									<label
										class="grid size-10 cursor-pointer place-items-center rounded-lg border text-sm font-semibold transition-colors {val === o
											? 'border-indigo-600 bg-indigo-600 text-white'
											: 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}"
									>
										<input
											type="radio"
											name="jw-{no}"
											value={o}
											checked={val === o}
											onchange={() => onInput(no, o)}
											class="sr-only"
										/>
										{o}
									</label>
								{/each}
								{#if val}
									<button
										type="button"
										onclick={() => onInput(no, '')}
										class="self-center px-1 text-xs text-slate-400 hover:text-red-600"
									>
										hapus
									</button>
								{/if}
							</div>
						{:else}
							<input
								type="text"
								value={val}
								oninput={(e) => onInput(no, e.currentTarget.value)}
								placeholder="Tulis jawaban singkat…"
								maxlength={500}
								class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
							/>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Bar aksi bawah -->
			<div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
				<div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
					<p class="text-xs text-slate-500">
						Jawaban tersimpan otomatis. Sisa {formatCountdown(sisa)}.
					</p>
					<Button onclick={() => (showKonfirmasi = true)} disabled={submitting}>
						Kumpulkan Jawaban
					</Button>
				</div>
			</div>
		{/if}
	</div>

	<Modal open={showKonfirmasi} onclose={() => (showKonfirmasi = false)} title="Kumpulkan jawaban?">
		<p class="text-sm text-slate-600">
			Anda sudah mengisi <span class="font-semibold">{terjawab}</span> dari <span class="font-semibold">{jumlahSoal}</span> nomor.
			{#if terjawab < jumlahSoal}
				<span class="mt-2 block rounded-lg bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-amber-200">
					Masih ada {jumlahSoal - terjawab} nomor kosong. Periksa lagi sebelum mengumpulkan.
				</span>
			{/if}
			<span class="mt-2 block">Setelah dikumpulkan, jawaban <span class="font-medium">tidak bisa diubah lagi</span>.</span>
		</p>
		{#snippet footer()}
			<Button variant="secondary" onclick={() => (showKonfirmasi = false)}>Periksa lagi</Button>
			<Button onclick={submitManual} disabled={submitting}>
				{submitting ? 'Mengirim…' : 'Ya, kumpulkan'}
			</Button>
		{/snippet}
	</Modal>

	{#if teguran && aktif}
		<!-- Peringatan besar yang menutup layar: siswa yang ketahuan keluar/
			 buka tab baru harus membacanya dulu sebelum lanjut mengerjakan. -->
		<div
			role="alert"
			class="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4 backdrop-blur-sm"
		>
			<div class="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
				<div class="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-red-100 text-3xl">
					⚠
				</div>
				<h2 class="text-lg font-bold text-red-700">Pelanggaran terdeteksi!</h2>
				<p class="mt-2 text-sm text-slate-700">{teguran}</p>
				<p class="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800 ring-1 ring-orange-200">
					{#if batasPelanggaran > 0}
						Setelah {batasPelanggaran}× pelanggaran, jawaban Anda <span class="font-semibold">otomatis dikumpulkan</span> dan tidak bisa dilanjutkan.
					{:else}
						Pindah tab/jendela dicatat dan dilaporkan ke pengawas.
					{/if}
				</p>
				<div class="mt-5">
					<Button onclick={() => (teguran = '')}>Saya mengerti, lanjutkan</Button>
				</div>
				{#if batasPelanggaran > 0 && jumlahPelanggaran > 0}
					<p class="mt-3 text-xs text-slate-400">
						Pelanggaran Anda: {jumlahPelanggaran} dari {batasPelanggaran}
					</p>
				{/if}
			</div>
		</div>
	{/if}
{:else}
	<div class="mx-auto max-w-md py-16 text-center">
		<p class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
			{fatal || 'Sesi tidak tersedia.'}
		</p>
		<Button onclick={masukUlang}>Masuk dengan kode akses</Button>
	</div>
{/if}
