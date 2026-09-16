# KlikUjian Frontend

## Konfigurasi API

Salin `.env.example` menjadi `.env.local` untuk development:

```sh
cp .env.example .env.local
```

Saat development, request `/api` diproxy Vite ke `VITE_API_TARGET` (default:
`http://localhost:8080`). Isi `VITE_API_BASE` hanya jika frontend harus
mengakses backend secara langsung dari browser. Untuk deployment saat ini,
gunakan `https://api.ayosekolah.my.id`.

Pada production Docker, frontend memakai path relatif `/api` dan nginx
meneruskan request ke `BACKEND_URL`. Nilai ini dapat diganti saat container
dijalankan, misalnya:

```sh
docker run -e BACKEND_URL=http://backend:8080 -p 8080:80 klikujian-frontend
```

## Development

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.17.0 create --template minimal --types ts --add tailwindcss="plugins:none" --no-install frontend
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
