<script lang="ts">
	// FR-1: CRUD kelas (admin). Guru boleh melihat untuk memilih kelas.
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { toast } from '$lib/stores/toast';
	import { isAdmin } from '$lib/stores/auth';
	import type { Kelas, User } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let kelasList = $state<Kelas[]>([]);
	let guruList = $state<User[]>([]);
	let loading = $state(true);

	let showForm = $state(false);
	let editing = $state<Kelas | null>(null);
	let deleting = $state<Kelas | null>(null);

	let nama_kelas = $state('');
	let wali_kelas_id = $state('');
	let submitting = $state(false);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	async function load() {
		loading = true;
		try {
			kelasList = await authApi.kelasList();
			if ($isAdmin) guruList = await authApi.usersList();
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	function openForm(k: Kelas | null) {
		editing = k;
		nama_kelas = k?.nama_kelas ?? '';
		wali_kelas_id = k?.wali_kelas_id ?? '';
		formError = '';
		fieldErrors = {};
		showForm = true;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		formError = '';
		fieldErrors = {};
		try {
			const input = { nama_kelas: nama_kelas.trim(), wali_kelas_id: wali_kelas_id || null };
			if (editing) await authApi.kelasUpdate(editing.id, input);
			else await authApi.kelasCreate(input);
			toast.success(editing ? 'Kelas diperbarui' : 'Kelas dibuat');
			showForm = false;
			await load();
		} catch (err) {
			const fe = toFormError(err);
			formError = fe.message;
			fieldErrors = fe.fields;
		} finally {
			submitting = false;
		}
	}

	async function confirmDelete() {
		if (!deleting) return;
		try {
			await authApi.kelasDelete(deleting.id);
			toast.success('Kelas dihapus');
			deleting = null;
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}

	const waliOptions = $derived(guruList.filter((u) => u.role === 'guru'));
</script>

<svelte:head><title>Kelas — KlikUjian</title></svelte:head>

<div class="mb-4 flex items-center justify-between gap-3">
	<h1 class="text-lg font-semibold">Kelas</h1>
	{#if $isAdmin}
		<Button onclick={() => openForm(null)}>+ Tambah Kelas</Button>
	{/if}
</div>

{#if loading}
	<p class="py-10 text-center text-sm text-slate-500">Memuat…</p>
{:else if kelasList.length === 0}
	<Card>
		<p class="py-6 text-center text-sm text-slate-500">Belum ada kelas terdaftar.</p>
	</Card>
{:else}
	<Card>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
						<th class="py-2 pr-3 font-medium">Nama kelas</th>
						<th class="py-2 pr-3 font-medium">Wali kelas</th>
						<th class="py-2 pr-3 font-medium">Jumlah ujian</th>
						{#if $isAdmin}<th class="py-2 text-right font-medium">Aksi</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each kelasList as k (k.id)}
						<tr class="border-b border-slate-100 last:border-0">
							<td class="py-2.5 pr-3 font-medium text-slate-900">{k.nama_kelas}</td>
							<td class="py-2.5 pr-3 text-slate-600">{k.wali_kelas_nama || '—'}</td>
							<td class="py-2.5 pr-3 text-slate-600">{k.jumlah_ujian}</td>
							{#if $isAdmin}
								<td class="py-2.5 text-right">
									<div class="inline-flex gap-1.5">
										<button type="button" class="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onclick={() => openForm(k)}>Edit</button>
										<button type="button" class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onclick={() => (deleting = k)}>Hapus</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{/if}

<Modal open={showForm} onclose={() => (showForm = false)} title={editing ? 'Edit Kelas' : 'Tambah Kelas'}>
	<form onsubmit={submit} class="space-y-4">
		<Field label="Nama kelas" name="nama_kelas" bind:value={nama_kelas} error={fieldErrors.nama_kelas} required placeholder="XII RPL 1" />

		<Select label="Wali kelas" name="wali_kelas_id" bind:value={wali_kelas_id} error={fieldErrors.wali_kelas_id}>
			<option value="">(tidak ditentukan)</option>
			{#each waliOptions as g (g.id)}
				<option value={g.id}>{g.nama}</option>
			{/each}
		</Select>

		{#if formError}
			<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>
		{/if}

		<div class="flex justify-end gap-2 pt-1">
			<Button variant="secondary" onclick={() => (showForm = false)}>Batal</Button>
			<Button type="submit" disabled={submitting}>{submitting ? 'Menyimpan…' : 'Simpan'}</Button>
		</div>
	</form>
</Modal>

<Modal open={!!deleting} onclose={() => (deleting = null)} title="Hapus kelas?">
	{#if deleting}
		<p class="text-sm text-slate-600">
			Kelas <span class="font-medium">{deleting.nama_kelas}</span> akan dihapus.
			Kelas yang masih punya ujian tidak bisa dihapus.
		</p>
	{/if}
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (deleting = null)}>Batal</Button>
		<Button variant="danger" onclick={confirmDelete}>Hapus</Button>
	{/snippet}
</Modal>
