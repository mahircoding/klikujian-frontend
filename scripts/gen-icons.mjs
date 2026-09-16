// Menghasilkan ikon PWA (png) dari static/pwa.svg.
// Dijalankan manual saat mengubah logo: `pnpm gen:icons` (butuh `sharp` —
// install lokal sementara: `pnpm add -D sharp`). BUKAN bagian dari build:
// hasil png sudah ter-commit di static/, jadi Docker build tidak butuh sharp.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, '../static/pwa.svg'));
const out = join(here, '../static');

// Sizes manifest standar. 512 = maskable (padding aman, SVG sudah ber-viewport).
const sizes = [192, 512];
for (const s of sizes) {
	const buf = await sharp(svg).resize(s, s).png().toBuffer();
	writeFileSync(join(out, `pwa-${s}x${s}.png`), buf);
	// versi "any" (identik) utk kompatibilitas + apple touch 180
	if (s === 192) writeFileSync(join(out, 'pwa-apple-touch.png'), await sharp(svg).resize(180, 180).png().toBuffer());
	console.log(`  ✓ pwa-${s}x${s}.png`);
}
