import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static/SSG ke Cloudflare Pages (PRD bagian 3).
			// fallback: SPA-ish rewrite supaya deep link tetap dilayani.
			adapter: adapter({ fallback: '200.html' })
		}),
		// PWA: shell + ikon + manifest ter-cache untuk install & akses offline.
		SvelteKitPWA({
			strategies: 'generateSW',
			// Update SW otomatis saat user membuka app berikutnya — TIDAK
			// me-reload halaman ujian yang sedang berjalan (autoUpdate hanya
			// claim klien baru; halaman existing tetap pakai SW lama sampai navigasi).
			registerType: 'autoUpdate',
			includeAssets: ['pwa.svg', 'favicon.svg'],
			manifest: {
				name: 'KlikUjian — Lembar Jawaban Digital',
				short_name: 'KlikUjian',
				description:
					'Lembar jawaban digital: siswa mengisi jawaban lewat HP/laptop, guru menilai otomatis (PG) + koreksi manual (isian), rekap & export Excel/PDF.',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'portrait',
				theme_color: '#4f46e5',
				background_color: '#f8fafc',
				lang: 'id',
				categories: ['education', 'productivity'],
				icons: [
					{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				],
				shortcuts: [
					{
						name: 'Masuk Ujian',
						url: '/',
						description: 'Masuk dengan kode akses 6 angka',
						icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
					},
					{
						name: 'Login Guru',
						url: '/admin/login',
						description: 'Masuk untuk guru & admin',
						icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
					}
				]
			},
			workbox: {
				// Precae: seluruh shell hasil build + statis (ikon, manifest).
				globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
				navigateFallback: '/200.html',
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						// API selalu dari jaringan — TIDAK pernah di-cache.
						// Alasan: jawaban siswa & waktu ujian adalah data live;
						// melayani respons lama = risiko jawaban hilang/salah.
						// (PRD §7: keputusan waktu & skor di server.)
						urlPattern: /^https?:\/\/.*\/api\/.*/i,
						handler: 'NetworkOnly'
					}
				]
			},
			devOptions: {
				// Service worker hanya di build produksi; saat dev biarkan proxy Vite.
				enabled: false
			}
		})
	],
	server: {
		// Proxy /api ke backend Go saat dev — frontend tidak perlu menyimpan
		// URL backend, dan tidak ada masalah CORS.
		proxy: {
			'/api': {
				target: process.env.VITE_API_TARGET ?? 'http://localhost:8080',
				changeOrigin: true
			}
		}
	}
});
