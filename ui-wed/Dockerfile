# Multi-stage build: compile the Vite app, then serve the static output with
# nginx -- mirrors service-wed's own builder/runner Dockerfile pattern.
#
# The previous version of this file ran `npm run dev` (the Vite *development*
# server) as the container's long-running process. That's not just
# unoptimized -- Vite's dev server actively rejects requests whose Host
# header isn't on an allowlist (anti DNS-rebinding protection), so once this
# sits behind Traefik on a real LAN IP or domain instead of localhost, it
# refuses the request outright. A real deployment needs `vite build`'s
# static output served by something meant for that job.
FROM node:26-alpine AS builder

WORKDIR /app

# Copy dependency definitions first so `npm install` is cached across builds
# that only change application code, not dependencies.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
