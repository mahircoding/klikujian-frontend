// Konfigurasi environment untuk aplikasi frontend.
// Nilai di sini HARUS bisa diganti lewat env saat build di Cloudflare Pages.

/**
 * Base URL API.
 * Development tetap memakai proxy Vite; production punya fallback agar
 * bundle tidak kembali memanggil domain frontend jika env build terlewat.
 */
export const API_BASE: string =
	import.meta.env.VITE_API_BASE ||
	(import.meta.env.PROD ? 'https://api.ayosekolah.my.id' : '');
