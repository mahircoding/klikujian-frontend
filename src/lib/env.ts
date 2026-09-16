// Konfigurasi environment untuk aplikasi frontend.
// Nilai di sini HARUS bisa diganti lewat env saat build di Cloudflare Pages.

/**
 * Base URL API.
 * Development tetap memakai proxy Vite; production punya fallback agar
 * bundle tidak kembali memanggil domain frontend jika env build terlewat.
 */
// Production selalu memakai backend publik. Dengan memilih berdasarkan mode
// build, bundle tidak dapat kembali memakai URL relatif `/api` saat env Vite
// di Dokploy tidak ikut terbaca.
export const API_BASE: string = import.meta.env.DEV
	? (import.meta.env.VITE_API_BASE || '')
	: 'https://api.ayosekolah.my.id';
