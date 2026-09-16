// Notifikasi ringkas (sukses/gagal aksi) — store Svelte biasa, tanpa library.
import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	type: 'success' | 'error';
	message: string;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	let nextId = 1;

	function push(type: Toast['type'], message: string) {
		const id = nextId++;
		update((t) => [...t, { id, type, message }]);
		setTimeout(() => dismiss(id), 4000);
	}

	function dismiss(id: number) {
		update((t) => t.filter((x) => x.id !== id));
	}

	return {
		subscribe,
		success: (m: string) => push('success', m),
		error: (m: string) => push('error', m),
		dismiss,
	};
}

export const toast = createToastStore();
