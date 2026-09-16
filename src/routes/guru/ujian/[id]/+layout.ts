// SPA (ssr=false): load jalan di browser. Data ujian dipakai layout header
// dan bisa dibaca ulang oleh anak-anaknya lewat $page.data.ujian.
//
// prerender=false: rute dinamis [id] tidak bisa dibangkitkan statis saat build;
// dilayani lewat fallback 200.html lalu load() mengambil data dari API.
export const prerender = false;

import { authApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { Ujian } from '$lib/types';

export async function load({ params, fetch }) {
	try {
		const ujian = await authApi.ujianGet(params.id, fetch);
		return { ujian };
	} catch (e) {
		error(404, 'Ujian tidak ditemukan atau Anda bukan pemiliknya.');
	}
}

export type UjianLoad = { ujian: Ujian };
