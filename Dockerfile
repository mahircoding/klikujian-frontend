# KlikUjian FE — SvelteKit static build, disajikan nginx + proxy /api ke backend.
# Build arg hanya utk preview/alternatif; saat runtime FE memakai path /api (relatif),
# jadi domain API TIDAK dibake ke bundle — ganti backend cukup ubah env BACKEND_URL.

FROM node:24-alpine AS build
WORKDIR /app
ENV CI=true
# corepack dihapus dari Node terbaru — install pnpm langsung (versi sesuai package.json)
RUN npm i -g pnpm@10.28.1
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
# VITE_API_BASE kosong = mode proxy (direkomendasikan). Isi full URL hanya bila
# FE tidak berada di belakang proxy nginx ini.
ARG VITE_API_BASE=
ENV VITE_API_BASE=$VITE_API_BASE
RUN pnpm build

FROM nginx:1.27-alpine
# Template nginx resmi men-substitusi ${VAR} dari environment saat container start.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
# Backend di project Dokploy/network compose yang sama:
#   BACKEND_URL=http://<nama-service-backend>:8080
ENV BACKEND_URL=http://backend:8080
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
