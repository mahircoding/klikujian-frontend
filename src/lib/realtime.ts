// SSE klien utk dashboard realtime guru. EventSource biasa TIDAK bisa kirim
// header Authorization, jadi pakai fetch + parse manual frame SSE.

import { API_BASE } from '$lib/env';
import { getStoredToken } from '$lib/api';
import type { ProgressPayload } from '$lib/types';

export interface ProgressStream {
	close(): void;
}

export function openProgressStream(
	ujianId: string,
	onProgres: (p: ProgressPayload) => void,
	onState: (s: 'connecting' | 'open' | 'closed') => void
): ProgressStream {
	const ctrl = new AbortController();
	let closed = false;

	(async () => {
		while (!closed) {
			try {
				onState('connecting');
				const token = getStoredToken();
				const res = await fetch(`${API_BASE}/api/ujian/${ujianId}/realtime`, {
					headers: {
						Accept: 'text/event-stream',
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					signal: ctrl.signal,
				});
				if (!res.ok || !res.body) {
					onState('closed');
					return; // 401/403/404: jangan retry, biar halaman tampilkan pesan
				}
				onState('open');

				const reader = res.body.getReader();
				const dec = new TextDecoder();
				let buf = '';
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					buf += dec.decode(value, { stream: true });
					// frame SSE dipisah baris kosong ganda
					let sep: number;
					while ((sep = buf.indexOf('\n\n')) >= 0) {
						const frame = buf.slice(0, sep);
						buf = buf.slice(sep + 2);
						handle(frame);
					}
				}
			} catch {
				/* koneksi putus — masuk loop retry di bawah */
			}
			if (closed) return;
			onState('connecting');
			await new Promise((r) => setTimeout(r, 3000)); // backoff sederhana
		}
	})();

	function handle(frame: string) {
		let event = 'message';
		for (const line of frame.split('\n')) {
			if (line.startsWith('event: ')) event = line.slice(7).trim();
			else if (line.startsWith('data: ') && event === 'progres') {
				try {
					onProgres(JSON.parse(line.slice(6)) as ProgressPayload);
				} catch {
					/* frame rusak: lewati */
				}
			}
		}
	}

	return {
		close() {
			closed = true;
			ctrl.abort();
			onState('closed');
		},
	};
}
