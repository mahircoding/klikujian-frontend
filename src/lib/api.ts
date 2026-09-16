// Wrapper fetch terpusat (PRD bagian 3). Semua panggilan HTTP lewat sini:
// base URL, bearer token, dan normalisasi error ditangani sekali saja.
//
// Kontrak seragam: sukses = kembalikan `data` ter-unwrap; gagal = lempar
// ApiError berisi pesan server + errors per field (dari validator backend).

import { API_BASE } from '$lib/env';
import { ApiError, type ApiEnvelope } from '$lib/types';
import type {
	Kelas,
	KelasInput,
	KoreksiListResponse,
	KoreksiPeserta,
	KunciResponse,
	KunciSaveResponse,
	LoginResponse,
	PelanggaranLaporResponse,
	PelanggaranListResponse,
	PreviewUjian,
	RekapResponse,
	Sesi,
	SoalListResponse,
	SubmitHasil,
	TipeJawaban,
	Ujian,
	UjianInput,
	UjianPublik,
	UjianStatus,
	User,
	UserInput,
} from '$lib/types';

const TOKEN_KEY = 'klikujian_token';

// Token disimpan di localStorage supaya refresh tidak logout.
// (Bukan untuk data sensitif siswa — sesi siswa pakai token_sesi sendiri.)
export function getStoredToken(): string | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setStoredToken(token: string | null): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (token) localStorage.setItem(TOKEN_KEY, token);
		else localStorage.removeItem(TOKEN_KEY);
	} catch {
		// private mode / storage penuh: sesi tetap jalan in-memory
	}
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	query?: Query;
	/** false = jangan kirim Authorization header (endpoint publik siswa). */
	auth?: boolean;
	/** Fetch implementation dari SvelteKit load, jika tersedia. */
	fetcher?: typeof fetch;
}

function buildUrl(path: string, query?: Query): string {
	const base = API_BASE ? `${API_BASE.replace(/\/$/, '')}${path}` : path;
	const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
		}
	}
	return url.pathname + url.search;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
	const { method = 'GET', body, query, auth = true, fetcher = fetch } = opts;

	const headers: Record<string, string> = { Accept: 'application/json' };
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	const token = auth ? getStoredToken() : null;
	if (token) headers['Authorization'] = `Bearer ${token}`;

	let res: Response;
	try {
		res = await fetcher(buildUrl(path, query), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch {
		throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi Anda.');
	}

	let payload: ApiEnvelope<T> | null = null;
	const ctype = res.headers.get('content-type') ?? '';
	if (res.status !== 204 && ctype.includes('application/json')) {
		payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
	}

	if (!res.ok || (payload && payload.success === false)) {
		if (res.status === 401 && auth) {
			// Token kedaluwarsa/salah: bersihkan supaya layout redirect ke login.
			setStoredToken(null);
		}
		throw new ApiError(res.status, payload?.message ?? `Request gagal (${res.status})`, payload?.errors);
	}

	return (payload?.data ?? null) as T;
}

// Endpoint ter-autentikasi admin/guru (PRD bagian 9).
export const authApi = {
	login: (email: string, password: string) =>
		api<LoginResponse>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
	me: () => api<User>('/api/auth/me'),

	kelasList: () => api<Kelas[]>('/api/kelas'),
	kelasCreate: (input: KelasInput) => api<Kelas>('/api/kelas', { method: 'POST', body: input }),
	kelasUpdate: (id: string, input: KelasInput) =>
		api<Kelas>(`/api/kelas/${id}`, { method: 'PUT', body: input }),
	kelasDelete: (id: string) => api<null>(`/api/kelas/${id}`, { method: 'DELETE' }),

	// Tipe soal per nomor (draft saja)
	soalList: (id: string) => api<SoalListResponse>(`/api/ujian/${id}/soal`),
	soalSetTipe: (id: string, no: number, tipe: TipeJawaban, jumlah_opsi?: number) =>
		api<null>(`/api/ujian/${id}/soal/${no}`, { method: 'PATCH', body: { tipe, jumlah_opsi } }),

	ujianList: (kelasId?: string) => api<Ujian[]>('/api/ujian', { query: { kelas_id: kelasId } }),
	ujianGet: (id: string, fetcher?: typeof fetch) => api<Ujian>(`/api/ujian/${id}`, { fetcher }),
	ujianCreate: (input: UjianInput) => api<Ujian>('/api/ujian', { method: 'POST', body: input }),
	ujianUpdate: (id: string, input: UjianInput) =>
		api<Ujian>(`/api/ujian/${id}`, { method: 'PUT', body: input }),
	ujianStatus: (id: string, status: UjianStatus) =>
		api<Ujian>(`/api/ujian/${id}/status`, { method: 'PATCH', body: { status } }),
	ujianDelete: (id: string) => api<null>(`/api/ujian/${id}`, { method: 'DELETE' }),

	usersList: () => api<User[]>('/api/users'),
	usersCreate: (input: UserInput) => api<User>('/api/users', { method: 'POST', body: input }),
	usersUpdate: (id: string, input: Partial<UserInput>) =>
		api<User>(`/api/users/${id}`, { method: 'PUT', body: input }),
	usersDelete: (id: string) => api<null>(`/api/users/${id}`, { method: 'DELETE' }),

	// Fase 4 — kunci jawaban & penilaian
	kunciGet: (id: string) => api<KunciResponse>(`/api/ujian/${id}/kunci`),
	kunciSave: (id: string, items: { no_soal: number; jawaban_benar: string }[]) =>
		api<KunciSaveResponse>(`/api/ujian/${id}/kunci`, { method: 'PUT', body: { items } }),
	hitungNilai: (id: string) =>
		api<{ jumlah_dinilai: number; pesan: string }>(`/api/ujian/${id}/hitung-nilai`, { method: 'POST' }),
	rekapNilai: (id: string) => api<RekapResponse>(`/api/ujian/${id}/rekap-nilai`),

	// Koreksi manual soal isian singkat
	koreksiList: (id: string) => api<KoreksiListResponse>(`/api/ujian/${id}/koreksi`),
	pelanggaranList: (id: string) => api<PelanggaranListResponse>(`/api/ujian/${id}/pelanggaran`),
	koreksiGet: (id: string, peserta: string) =>
		api<KoreksiPeserta>(`/api/ujian/${id}/koreksi/${peserta}`),
	koreksiSave: (id: string, peserta: string, items: { no_soal: number; poin: number }[]) =>
		api<null>(`/api/ujian/${id}/koreksi/${peserta}`, { method: 'PUT', body: { items } }),
};

/**
 * Unduh laporan (excel/pdf) dengan header Authorization — karenanya tidak
 * bisa pakai <a href> biasa. Response dibaca sebagai blob lalu disimpan.
 */
export async function downloadExport(id: string, format: 'excel' | 'pdf'): Promise<void> {
	const token = getStoredToken();
	const res = await fetch(buildUrl(`/api/ujian/${id}/export/${format}`), {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
	if (!res.ok) {
		// Gagal = server membalas envelope JSON (bukan file).
		let message = `Gagal mengunduh (${res.status})`;
		try {
			const payload = (await res.json()) as ApiEnvelope<null>;
			if (payload.message) message = payload.message;
		} catch {
			/* bukan JSON: pakai pesan umum */
		}
		throw new ApiError(res.status, message);
	}

	const blob = await res.blob();
	const name =
		/content-disposition:[^;]*filename="?([^"]+)"?/i.exec(res.headers.get('content-disposition') ?? '')?.[1] ??
		`rekap-${format}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

// Endpoint publik siswa — tanpa Authorization header (PRD FR-3).
export const pesertaApi = {
	preview: (kode: string) =>
		api<PreviewUjian>(`/api/peserta/preview/${encodeURIComponent(kode.trim().toUpperCase())}`, {
			auth: false,
		}),
	masuk: (kode_akses: string, nama: string, no_absen: number) =>
		api<Sesi>('/api/peserta/masuk', {
			method: 'POST',
			body: { kode_akses, nama, no_absen },
			auth: false,
		}),
	status: (token: string) => api<Sesi>(`/api/peserta/${encodeURIComponent(token)}/status`, { auth: false }),
	simpanJawaban: (token: string, noSoal: number, jawaban: string) =>
		api<null>(`/api/peserta/${encodeURIComponent(token)}/jawaban/${noSoal}`, {
			method: 'PUT',
			body: { jawaban_siswa: jawaban },
			auth: false,
		}),
	submit: (token: string, timeout = false) =>
		api<SubmitHasil>(`/api/peserta/${encodeURIComponent(token)}/submit`, {
			method: 'POST',
			body: { timeout },
			auth: false,
		}),
	laporPelanggaran: (token: string, jenis: string, durasi_ms: number, no_soal_aktif: number) =>
		api<PelanggaranLaporResponse>(`/api/peserta/${encodeURIComponent(token)}/pelanggaran`, {
			method: 'POST',
			body: { jenis, durasi_ms, no_soal_aktif },
			auth: false,
		}),
};
