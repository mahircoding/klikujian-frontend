/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/svelte" />

// Vite men-declare ImportMeta.env lewat vite/client; cukup daftarkan env kita.
interface ImportMetaEnv {
	readonly VITE_API_BASE?: string;
	readonly VITE_API_TARGET?: string;
}
