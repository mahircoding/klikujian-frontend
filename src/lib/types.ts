// Tipe yang mencerminkan DTO backend (internal/dto).

export interface User {
	id: string;
	nama: string;
	email: string;
	role: 'admin' | 'guru';
}

export interface LoginResponse {
	token: string;
	expires_at: string;
	user: User;
}

export interface Kelas {
	id: string;
	nama_kelas: string;
	wali_kelas_id: string | null;
	wali_kelas_nama: string;
	jumlah_ujian: number;
	created_at: string;
	updated_at: string;
}

export type UjianStatus = 'draft' | 'aktif' | 'selesai' | 'dikunci';
export type TipeJawaban = 'pilihan_ganda' | 'isian_singkat';

export interface Ujian {
	id: string;
	kelas_id: string;
	nama_kelas: string;
	guru_id: string;
	nama_guru: string;
	nama_ujian: string;
	mata_pelajaran: string | null;
	jumlah_soal: number;
	durasi_menit: number;
	tipe_jawaban: TipeJawaban;
	jumlah_opsi: number;
	kode_akses: string;
	status: UjianStatus;
	kunci_lengkap: boolean;
	batas_pelanggaran: number;
	jumlah_pelanggaran: number;
	tanggal_ujian: string | null;
	jumlah_peserta: number;
	jumlah_selesai: number;
	created_at: string;
	updated_at: string;
}

export interface UjianInput {
	kelas_id: string;
	nama_ujian: string;
	mata_pelajaran?: string | null;
	jumlah_soal: number;
	durasi_menit: number;
	tipe_jawaban: TipeJawaban;
	jumlah_opsi: number;
	tanggal_ujian?: string | null;
	/** anti-cheat: sekian kali keluar tab = auto-submit; 0 = tanpa batas */
	batas_pelanggaran?: number | null;
}

export interface KelasInput {
	nama_kelas: string;
	wali_kelas_id?: string | null;
}

export interface UserInput {
	nama: string;
	email: string;
	password: string;
	role: 'admin' | 'guru';
}

/** Bentuk envelope respons API backend. */
export interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data?: T;
	errors?: Record<string, string>;
}

/** Error terstruktur dari api.ts supaya halaman form bisa menampilkan per-field. */
export class ApiError extends Error {
	status: number;
	errors?: Record<string, string>;

	constructor(status: number, message: string, errors?: Record<string, string>) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.errors = errors;
	}
}

// ---- Sesi siswa (publik, tanpa JWT) — backend internal/dto/peserta.go ----

export type PesertaStatus = 'mengerjakan' | 'selesai' | 'waktu_habis';

/** Ujian versi publik — tanpa kunci/jawaban, dilihat siswa sebelum masuk. */
export interface UjianPublik {
	id: string;
	nama_ujian: string;
	mata_pelajaran: string | null;
	nama_kelas: string;
	jumlah_soal: number;
	durasi_menit: number;
	tipe_jawaban: TipeJawaban;
	jumlah_opsi: number;
	tanggal_ujian: string | null;
	status: UjianStatus;
}

export interface JawabanSiswaDTO {
	no_soal: number;
	jawaban: string;
}

/** Respons /api/peserta/masuk dan /api/peserta/:token/status — bentuk sama. */
export interface Sesi {
	token_sesi: string;
	nama: string;
	no_absen: number;
	status: PesertaStatus;
	waktu_mulai: string;
	waktu_deadline: string;
	/** detik tersisa menurut server */
	sisa_waktu: number;
	ujian: UjianPublik;
	soal: SoalInfo[];
	jawaban: JawabanSiswaDTO[];
	/** anti-cheat: jumlah event "keluar tab" tercatat utk sesi ini + batas ujian */
	jumlah_pelanggaran: number;
	batas_pelanggaran: number;
}

export interface SubmitHasil {
	status: PesertaStatus;
	jumlah_terjawab: number;
	jumlah_soal: number;
	pesan: string;
}

/** Satu baris log utk halaman "Pelanggaran" guru. */
export interface PelanggaranDetail {
	jenis: string;
	waktu: string;
	durasi_ms: number;
	no_soal_aktif: number;
}

export interface PelanggaranPesertaRow {
	peserta_id: string;
	nama: string;
	no_absen: number;
	status: PesertaStatus;
	jumlah: number;
	items: PelanggaranDetail[];
}

export interface PelanggaranListResponse {
	batas: number;
	rows: PelanggaranPesertaRow[];
}

/** Respons lapor anti-cheat: server yang memutuskan hukuman, client hanya tampil. */
export interface PelanggaranLaporResponse {
	jumlah_pelanggaran: number;
	batas: number;
	sisa_sebelum_tutup: number;
	auto_submitted: boolean;
	pesan: string;
}

// ---- Tipe soal per nomor (satu ujian boleh campur PG & isian singkat) ----

export interface SoalInfo {
	no_soal: number;
	tipe: TipeJawaban;
	jumlah_opsi: number;
}

export interface SoalListResponse {
	jumlah_soal: number;
	status: UjianStatus;
	tipe_default: TipeJawaban;
	items: SoalInfo[];
}

export interface PreviewUjian {
	ujian: UjianPublik;
	soal: SoalInfo[];
}

// ---- Realtime progress (SSE) — backend internal/hub ----

export interface ProgressRow {
	peserta_id: string;
	no_absen: number;
	nama: string;
	status: PesertaStatus;
	jumlah_terisi: number;
	sisa_waktu: number;
	jumlah_pelanggaran: number;
}

export interface ProgressPayload {
	ujian_id: string;
	jumlah_peserta: number;
	jumlah_selesai: number;
	batas_pelanggaran: number;
	rows: ProgressRow[];
}

// ---- Penilaian (Fase 4) — backend internal/dto/{kunci,nilai}.go ----

export interface KunciItemDTO {
	no_soal: number;
	tipe: TipeJawaban;
	jawaban_benar: string;
	jumlah_opsi: number;
}

export interface KunciResponse {
	jumlah_soal: number;
	jumlah_pg: number;
	jumlah_isian: number;
	tipe_jawaban: TipeJawaban;
	jumlah_opsi: number;
	lengkap: boolean;
	items: KunciItemDTO[];
}

export interface KunciSaveResponse {
	lengkap: boolean;
	jumlah_terisi: number;
	jumlah_soal: number;
	nilai_dihitung: boolean;
}

export interface RekapBaris {
	peserta_id: string;
	no_absen: number;
	nama: string;
	status: PesertaStatus;
	waktu_submit: string | null;
	jumlah_benar: number;
	jumlah_salah: number;
	jumlah_kosong: number;
	skor: number;
	butuh_koreksi: boolean;
	jumlah_pelanggaran: number;
}

export interface RekapResponse {
	ujian: UjianPublik;
	jumlah_peserta: number;
	jumlah_selesai: number;
	jumlah_isian: number;
	jumlah_perlu_koreksi: number;
	rata_rata: number;
	tertinggi: number;
	terendah: number;
	dihitung_pada: string | null;
	rows: RekapBaris[];
}

// ---- Koreksi manual isian singkat ----

export interface KoreksiNomor {
	no_soal: number;
	jawaban: string;
	poin: number;
	terkoreksi: boolean;
}

export interface KoreksiPeserta {
	peserta_id: string;
	nama: string;
	no_absen: number;
	status: PesertaStatus;
	jumlah_soal: number;
	jumlah_isian: number;
	items: KoreksiNomor[];
}

export interface KoreksiPesertaRingkas {
	peserta_id: string;
	nama: string;
	no_absen: number;
	status: PesertaStatus;
	jumlah_isian: number;
	sudah_dinilai: number;
	belum_selesai: boolean;
}

export interface KoreksiListResponse {
	jumlah_isian: number;
	rows: KoreksiPesertaRingkas[];
}
