<script lang="ts">
	import { onMount } from 'svelte';
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { nextStatus, statusClass, statusLabel } from '$lib/ujianMeta';
	import { toast } from '$lib/stores/toast';
	import type { Kelas, Ujian, UjianInput, UjianStatus } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import UjianForm from '$lib/components/UjianForm.svelte';

	let ujianan = $state<Ujian[]>([]);
	let kelasList = $state<Kelas[]>([]);
	let filterKelas = $state('');
	let loading = $state(true);

	let showForm = $state(false);
	let editing = $state<Ujian | null>(null);
	let deleting = $state<Ujian | null>(null);

	async function load() {
		loading = true;
		try {
			// efek di bawah membaca filterKelas, jadi perubahan filter ikut reload
			ujianan = await authApi.ujianList(filterKelas || undefined);
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadKelas();
	});

	async function loadKelas() {
		try {
			kelasList = await authApi.kelasList();
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}

	// load() async: panggil sinkron, abaikan promise — error sudah di-toast di dalam.
	$effect(() => {
		load();
	});

	/** Dipanggil UjianForm. Return error yang sudah dinormalisasi, atau null bila sukses. */
	async function save(input: UjianInput): Promise<ReturnType<typeof toFormError> | null> {
		try {
			const res = editing
				? await authApi.ujianUpdate(editing.id, input)
				: await authApi.ujianCreate(input);
			toast.success(editing ? 'Ujian diperbarui' : `Ujian dibuat — kode akses: ${res.kode_akses}`);
			showForm = false;
			editing = null;
			await load();
			return null;
		} catch (err) {
			return toFormError(err);
		}
	}

	async function changeStatus(u: Ujian, status: UjianStatus) {
		try {
			await authApi.ujianStatus(u.id, status);
			toast.success(`Status diubah ke ${statusLabel[status]}`);
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}

	async function confirmDelete() {
		if (!deleting) return;
		try {
			await authApi.ujianDelete(deleting.id);
			toast.success('Ujian dihapus');
			deleting = null;
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}
</script>

<svelte:head><title>Ujian — KlikUjian</title></svelte:head>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<h1 class="text-lg font-semibold">Ujian Saya</h1>
	<div class="flex items-end gap-2">
		<div class="w-44">
			<Select name="filter_kelas" bind:value={filterKelas}>
				<option value="">Semua kelas</option>
				{#each kelasList as k (k.id)}
					<option value={k.id}>{k.nama_kelas}</option>
				{/each}
			</Select>
		</div>
		<Button onclick={() => { editing = null; showForm = true; }}>+ Buat Ujian</Button>
	</div>
</div>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat…</p>
{:else if ujianan.length === 0}
	<Card>
		<p class="py-6 text-center text-sm text-slate-500">
			Belum ada ujian. Klik <span class="font-medium">Buat Ujian</span> untuk mulai.
		</p>
	</Card>
{:else}
	<div class="space-y-3">
		{#each ujianan as u (u.id)}
			<Card>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h2 class="truncate font-semibold">{u.nama_ujian}</h2>
							<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusClass[u.status]}">
								{statusLabel[u.status]}
							</span>
						</div>
						<p class="mt-0.5 text-sm text-slate-500">
							{u.nama_kelas}{#if u.mata_pelajaran} · {u.mata_pelajaran}{/if}
							· {u.jumlah_soal} soal · {u.durasi_menit} menit
						</p>
						<p class="mt-1 text-xs text-slate-400">
							Dibuat {new Date(u.created_at).toLocaleDateString('id-ID')}
							{#if u.jumlah_peserta} · {u.jumlah_peserta} peserta ({u.jumlah_selesai} selesai){/if}
						</p>
					</div>

					<code class="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-sm font-semibold tracking-wider text-indigo-700">
						{u.kode_akses}
					</code>
				</div>

				<div class="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
					<a
						href="/guru/ujian/{u.id}/kunci-jawaban"
						class="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50"
					>
						Kunci Jawaban
					</a>
					<a
						href="/guru/ujian/{u.id}/rekap-nilai"
						class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
					>
						Rekap Nilai
					</a>
					{#if nextStatus[u.status]}
						<Button variant="secondary" onclick={() => changeStatus(u, nextStatus[u.status]!.to)}>
							{nextStatus[u.status]!.label}
						</Button>
					{/if}
					{#if u.status === 'draft'}
						<Button variant="secondary" onclick={() => { editing = u; showForm = true; }}>
							Edit
						</Button>
						<Button variant="danger" onclick={() => (deleting = u)}>Hapus</Button>
					{/if}
				</div>
			</Card>
		{/each}
	</div>
{/if}

<UjianForm bind:open={showForm} {editing} {save} />

<Modal open={!!deleting} onclose={() => (deleting = null)} title="Hapus ujian?">
	{#if deleting}
		<p class="text-sm text-slate-600">
			Ujian <span class="font-medium">{deleting.nama_ujian}</span> akan dihapus. Tindakan ini tidak bisa dibatalkan.
		</p>
	{/if}
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (deleting = null)}>Batal</Button>
		<Button variant="danger" onclick={confirmDelete}>Hapus</Button>
	{/snippet}
</Modal>
