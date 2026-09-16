// Deteksi pelanggaran konsentrasi utk ujian (halaman pengerjaan):
//  1. tinggal_tab      — pindah tab (hidden -> visible, > threshold)
//  2. pindah_jendela   — pindah ke jendela/aplikasi lain (blur -> focus,
//                        tab tetap visible, > threshold). Alt-tab, klik app lain,
//                        window lain di layar split.
//  3. buka_tab         — pencobaan shortcut buka tab/jendela baru (Ctrl/Cmd + T/N/W).
//                        Browser mungkin tetap membukanya — page tak selalu bisa
//                        preventDefault — tapi percobaannya langsung dikenali:
//                        peringatan muncul SEKETIKA + dilaporkan ke server.
//
// Reload & tutup tab TIDAK terhitung (bukan kecurangan). Server yang mencatat,
// menegur, dan auto-submit — client hanya mendeteksi & menampilkan.

export type JenisPelanggaran = 'tinggal_tab' | 'pindah_jendela' | 'buka_tab';

export interface PelanggaranEvent {
	jenis: JenisPelanggaran;
	durasiMS: number;
	noSoalAktif: number;
}

export interface WatcherOptions {
	/** ms siswa harus benar-benar di luar sebelum dihitung pindah (anti flicker) */
	thresholdMS?: number;
	/** nomor soal yang sedang dilihat (getter, diambil saat event) */
	activeQuestion?: () => number;
	onPelanggaran: (e: PelanggaranEvent) => void;
	/** langsung saat shortcut ketahuan — sebelum browser sempat buka tab */
	onAttempt?: (e: PelanggaranEvent) => void;
	/** true bila sesi masih aktif — jangan lapor setelah submit/selesai */
	isLive: () => boolean;
}

export interface Watcher {
	stop(): void;
}

const shortcutKeys = new Set(['t', 'n', 'w']);

export function watchPelanggaran(opts: WatcherOptions): Watcher {
	const threshold = opts.thresholdMS ?? 1500;
	// leftAt terisi saat siswa meninggalkan halaman (tab hidden ATAU window blur);
	// kind menentukan laporan nanti (visibilitychange tab-switch terjadi duluan).
	let leftAt = 0;
	let kind: JenisPelanggaran = 'tinggal_tab';
	// penanda "blur ini bagian dari pindah tab" agar tidak dobel lapor
	let viaHidden = false;

	function onVisibility() {
		if (document.hidden) {
			if (opts.isLive() && leftAt === 0) {
				leftAt = Date.now();
				kind = 'tinggal_tab';
				viaHidden = true;
			}
			return;
		}
		returnToPage(); // visible lagi
	}

	function onBlur() {
		if (!opts.isLive() || leftAt !== 0) return;
		if (document.hidden) return; // sudah tertangkap visibilitychange
		leftAt = Date.now();
		kind = 'pindah_jendela';
	}

	function returnToPage() {
		if (leftAt === 0) return; // reload/first-paint: tidak ada sesi pergi tercatat
		const durasi = Date.now() - leftAt;
		leftAt = 0;
		if (durasi < threshold) return; // flicker/alt-tab cepat: bukan kecurangan
		if (!opts.isLive()) return;
		opts.onPelanggaran({ jenis: kind, durasiMS: durasi, noSoalAktif: opts.activeQuestion?.() ?? 0 });
		kind = 'tinggal_tab';
		viaHidden = false;
	}

	function onFocus() {
		if (viaHidden) {
			// kembali dari pindah tab: visibilitychange (visible) yang menangani,
			// supaya tidak dobel. Focus terjadi setelah visibilitychange.
			viaHidden = false;
			return;
		}
		returnToPage();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!opts.isLive()) return;
		if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
		const key = e.key.toLowerCase();
		if (!shortcutKeys.has(key)) return;
		e.preventDefault(); // sebagian browser memblokir; yang penting deteksinya
		const ev: PelanggaranEvent = { jenis: 'buka_tab', durasiMS: 0, noSoalAktif: opts.activeQuestion?.() ?? 0 };
		opts.onAttempt?.(ev);
		opts.onPelanggaran(ev);
	}

	document.addEventListener('visibilitychange', onVisibility);
	window.addEventListener('blur', onBlur);
	window.addEventListener('focus', onFocus);
	window.addEventListener('keydown', onKeydown, true);

	return {
		stop() {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
			window.removeEventListener('keydown', onKeydown, true);
		},
	};
}

/** Label jenis utk UI siswa & guru. */
export function labelPelanggaran(jenis: string): string {
	switch (jenis) {
		case 'tinggal_tab':
			return 'pindah ke tab lain';
		case 'pindah_jendela':
			return 'pindah ke jendela/aplikasi lain';
		case 'buka_tab':
			return 'mencoba buka tab/jendela baru';
		default:
			return jenis.replace(/_/g, ' ');
	}
}
