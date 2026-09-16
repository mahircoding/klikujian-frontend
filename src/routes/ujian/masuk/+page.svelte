<script lang="ts">
	// Deep link guru: /ujian/masuk?kode=... tetap dilayani (kompatibel dengan
	// PWA shortcut & link lama). Konten sama dengan beranda "/".
	import MasukUjian from '$lib/components/MasukUjian.svelte';
</script>

<svelte:head><title>Masuk Ujian — KlikUjian</title></svelte:head>

<MasukUjian />
