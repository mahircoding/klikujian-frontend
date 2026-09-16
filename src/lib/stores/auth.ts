// Store auth admin/guru (Svelte stores bawaan, tanpa library tambahan — PRD §3).
import { derived, writable } from 'svelte/store';
import { authApi, getStoredToken, setStoredToken } from '$lib/api';
import type { User } from '$lib/types';

export interface AuthState {
	user: User | null;
	loading: boolean;
}

function createAuthStore() {
	const { subscribe, set } = writable<AuthState>({ user: null, loading: true });

	return {
		subscribe,

		/** Verifikasi token tersimpan ke server. Panggil saat app start. */
		async restore() {
			if (!getStoredToken()) {
				set({ user: null, loading: false });
				return;
			}
			try {
				const user = await authApi.me();
				set({ user, loading: false });
			} catch {
				setStoredToken(null);
				set({ user: null, loading: false });
			}
		},

		/** Simpan sesi setelah login sukses. */
		login(token: string, user: User) {
			setStoredToken(token);
			set({ user, loading: false });
		},

		logout() {
			setStoredToken(null);
			set({ user: null, loading: false });
		},
	};
}

export const auth = createAuthStore();

/** true bila user ter-login dan ber-role admin. */
export const isAdmin = derived(auth, (s) => s.user?.role === 'admin');
