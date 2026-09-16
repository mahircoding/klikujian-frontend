<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth, isAdmin } from '$lib/stores/auth';

	const links = [
		{ href: '/guru/ujian', label: 'Ujian', adminOnly: false },
		{ href: '/admin/kelas', label: 'Kelas', adminOnly: false },
		{ href: '/admin/users', label: 'Akun Guru', adminOnly: true },
	];

	function logout() {
		auth.logout();
		goto('/admin/login');
	}
</script>

<header class="border-b border-slate-200 bg-white">
	<div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
		<a href="/guru/ujian" class="text-base font-bold tracking-tight text-indigo-700">KlikUjian</a>

		<nav class="flex items-center gap-1">
			{#each links as l (l.href)}
				{#if !l.adminOnly || $isAdmin}
					<a
						href={l.href}
						class="rounded-md px-2.5 py-1.5 text-sm {page.url.pathname.startsWith(l.href)
							? 'bg-indigo-50 font-medium text-indigo-700'
							: 'text-slate-600 hover:bg-slate-100'}"
					>
						{l.label}
					</a>
				{/if}
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-3">
			{#if $auth.user}
				<span class="hidden text-sm text-slate-500 sm:inline">
					{$auth.user.nama}
					<span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-500">{$auth.user.role}</span>
				</span>
				<button type="button" onclick={logout} class="text-sm text-slate-500 hover:text-red-600">
					Keluar
				</button>
			{/if}
		</div>
	</div>
</header>
