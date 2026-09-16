// Sesi ujian siswa: token sesi dibawa lewat URL ?sesi= (guru tidak butuh
// link unik; resume = masuk ulang dengan kode + no_absen yang sama).

/**
 * Deadline versi local: sisa waktu dari server di-offset terhadap jam device
 * HANYA untuk tampilan countdown. Keputusan waktu tetap milik server —
 * ubah jam HP tidak bisa dipakai curang karena tiap request divalidasi ulang.
 */
export function deadlineLocalMs(sisaWaktuDetik: number): number {
	return Date.now() + sisaWaktuDetik * 1000;
}

export function formatCountdown(detik: number): string {
	if (detik <= 0) return '00:00';
	const m = Math.floor(detik / 60);
	const s = detik % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
