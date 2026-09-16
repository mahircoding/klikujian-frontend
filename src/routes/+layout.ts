// SPA murni (PRD: static/SSG ke Cloudflare Pages). Data selalu dari API Go,
// jadi tidak perlu SSR; prerender menghasilkan shell statis per route.
export const ssr = false;
export const prerender = true;
export const csr = true;
