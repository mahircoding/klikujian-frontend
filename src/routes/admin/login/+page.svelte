<script lang="ts">
	// Panel guru & admin — pindah ke /admin/login supaya beranda "/" bebas
	// dipakai siswa mengakses ujian.
	import { goto } from '$app/navigation';
	import { authApi } from '$lib/api';
	import { toFormError } from '$lib/form';
	import { auth } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let formError = $state('');
	let fieldErrors = $state<Record<string, string>>({});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		formError = '';
		fieldErrors = {};
		try {
			const resp = await authApi.login(email, password);
			auth.login(resp.token, resp.user);
			goto('/guru/ujian');
		} catch (err) {
			const fe = toFormError(err);
			formError = fe.message;
			fieldErrors = fe.fields;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Login Guru — KlikUjian</title></svelte:head>

<div class="flex min-h-[80dvh] items-center justify-center">
	<div class="w-full max-w-sm">
		<div class="mb-6 text-center">
			<h1 class="text-xl font-bold text-indigo-700">KlikUjian</h1>
			<p class="mt-1 text-sm text-slate-500">Lembar jawaban digital untuk guru & admin</p>
		</div>

		<form onsubmit={submit} class="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
			<Field label="Email" name="email" type="email" bind:value={email} error={fieldErrors.email} required />
			<Field
				label="Password"
				name="password"
				type="password"
				bind:value={password}
				error={fieldErrors.password}
				required
			/>

			{#if formError}
				<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{formError}</p>
			{/if}

			<Button type="submit" disabled={loading} className="w-full">
				{loading ? 'Memproses…' : 'Masuk'}
			</Button>
		</form>

		<p class="mt-6 text-center text-xs text-slate-400">
			Siswa?
			<a href="/" class="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-indigo-600">
				Masukkan kode ujian
			</a>
		</p>
	</div>
</div>
