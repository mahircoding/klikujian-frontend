import type { UjianStatus } from '$lib/types';

export const statusLabel: Record<UjianStatus, string> = {
	draft: 'Draft',
	aktif: 'Aktif',
	selesai: 'Selesai',
	dikunci: 'Dikunci',
};

export const statusClass: Record<UjianStatus, string> = {
	draft: 'bg-slate-100 text-slate-600',
	aktif: 'bg-emerald-100 text-emerald-700',
	selesai: 'bg-amber-100 text-amber-700',
	dikunci: 'bg-slate-200 text-slate-700',
};

/** Transisi status sah berikutnya (PRD FR-2). Backend tetap memvalidasi. */
export const nextStatus: Partial<Record<UjianStatus, { to: UjianStatus; label: string }>> = {
	draft: { to: 'aktif', label: 'Aktifkan' },
	aktif: { to: 'selesai', label: 'Tandai Selesai' },
	selesai: { to: 'dikunci', label: 'Kunci Nilai' },
};
