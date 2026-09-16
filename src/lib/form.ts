// Util form: satu tempat untuk menormalkan ApiError -> pesan + error per field,
// supaya tiap halaman mutation tidak menduplikasi try/catch yang sama.
import { ApiError } from '$lib/types';

export interface FormError {
	message: string;
	fields: Record<string, string>;
}

export function toFormError(err: unknown): FormError {
	if (err instanceof ApiError) {
		return { message: err.message, fields: err.errors ?? {} };
	}
	return { message: 'Terjadi kesalahan tak terduga', fields: {} };
}
