# Multi-stage build: compile the Vite app, then serve the static output with
# nginx -- mirrors service-wed's own builder/runner Dockerfile pattern.
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
