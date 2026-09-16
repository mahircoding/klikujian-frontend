// Konfigurasi environment untuk aplikasi frontend.
// Nilai di sini HARUS bisa diganti lewat env saat build di Cloudflare Pages.

/** Base URL API. Kosong = pakai proxy dev Vite (/api -> localhost:8080). */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';
