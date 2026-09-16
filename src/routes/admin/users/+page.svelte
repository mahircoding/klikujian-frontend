<script lang="ts">
	// FR-7 (admin only): kelola akun guru/admin.
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { auth, isAdmin } from '$lib/stores/auth';
	import { toast } from '$lib/stores/toast';
	import type { User, UserInput } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let users = $state<User[]>([]);
	let loading = $state(true);

	let showForm = $state(false);
	let editing = $state<User | null>(null);
	let deleting = $state<User | null>(null);

	let nama = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state<'admin' | 'guru'>('guru');
	let submitting = $state(false);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	async function load() {
		loading = true;
		try {
			users = await authApi.usersList();
		} catch (err) {
			toast.error(toFormError(err).message);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	function openForm(u: User | null) {
		editing = u;
		nama = u?.nama ?? '';
		email = u?.email ?? '';
		password = '';
		role = u?.role ?? 'guru';
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
			if (editing) {
				const input: Partial<UserInput> = { nama: nama.trim(), email: email.trim(), role };
				if (password) input.password = password;
				await authApi.usersUpdate(editing.id, input);
				toast.success('Akun diperbarui');
			} else {
				await authApi.usersCreate({ nama: nama.trim(), email: email.trim(), password, role });
				toast.success('Akun dibuat');
			}
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
			await authApi.usersDelete(deleting.id);
			toast.success('Akun dihapus');
			deleting = null;
			await load();
		} catch (err) {
			toast.error(toFormError(err).message);
		}
	}
</script>

<svelte:head><title>Akun Guru — KlikUjian</title></svelte:head>

{#if $isAdmin}
	<div class="mb-4 flex items-center justify-between gap-3">
		<h1 class="text-lg font-semibold">Akun Guru & Admin</h1>
		<Button onclick={() => openForm(null)}>+ Tambah Akun</Button>
	</div>

	{#if loading}
		<p class="py-10 text-center text-sm text-slate-500">Memuat…</p>
	{:else}
		<Card>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
							<th class="py-2 pr-3 font-medium">Nama</th>
							<th class="py-2 pr-3 font-medium">Email</th>
							<th class="py-2 pr-3 font-medium">Role</th>
							<th class="py-2 text-right font-medium">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each users as u (u.id)}
							<tr class="border-b border-slate-100 last:border-0">
								<td class="py-2.5 pr-3 font-medium text-slate-900">
									{u.nama}
									{#if u.id === $auth.user?.id}<span class="ml-1 text-xs text-slate-400">(Anda)</span>{/if}
								</td>
								<td class="py-2.5 pr-3 text-slate-600">{u.email}</td>
								<td class="py-2.5 pr-3">
									<span class="rounded-full px-2 py-0.5 text-xs font-medium {u.role === 'admin'
										? 'bg-indigo-100 text-indigo-700'
										: 'bg-slate-100 text-slate-600'}">{u.role}</span>
								</td>
								<td class="py-2.5 text-right">
									<div class="inline-flex gap-1.5">
										<button type="button" class="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50" onclick={() => openForm(u)}>Edit</button>
										{#if u.id !== $auth.user?.id}
											<button type="button" class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onclick={() => (deleting = u)}>Hapus</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}

	<Modal open={showForm} onclose={() => (showForm = false)} title={editing ? 'Edit Akun' : 'Tambah Akun'}>
		<form onsubmit={submit} class="space-y-4">
			<Field label="Nama" name="nama" bind:value={nama} error={fieldErrors.nama} required />
			<Field label="Email" name="email" type="email" bind:value={email} error={fieldErrors.email} required />
			<Field
				label={editing ? 'Password baru (kosongkan bila tidak diubah)' : 'Password'}
				name="password"
				type="password"
				bind:value={password}
				error={fieldErrors.password}
				required={!editing}
			/>
			<Select label="Role" name="role" bind:value={role} error={fieldErrors.role} required>
				<option value="guru">Guru</option>
				<option value="admin">Admin</option>
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

	<Modal open={!!deleting} onclose={() => (deleting = null)} title="Hapus akun?">
		{#if deleting}
			<p class="text-sm text-slate-600">
				Akun <span class="font-medium">{deleting.nama}</span> ({deleting.email}) akan dihapus.
				Akun yang masih punya ujian atau jadi wali kelas tidak bisa dihapus.
			</p>
		{/if}
		{#snippet footer()}
			<Button variant="secondary" onclick={() => (deleting = null)}>Batal</Button>
			<Button variant="danger" onclick={confirmDelete}>Hapus</Button>
		{/snippet}
	</Modal>
{:else}
	<Card>
		<p class="py-6 text-center text-sm text-slate-500">Halaman ini hanya untuk admin.</p>
	</Card>
{/if}
