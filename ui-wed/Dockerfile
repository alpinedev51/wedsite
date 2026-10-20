# Multi-stage build: compile the Vite app, then serve the static output with
# nginx -- mirrors service-wed's own builder/runner Dockerfile pattern.
FROM node:24.22.0-alpine AS builder

WORKDIR /app

# Copy dependency definitions first so the install is cached across builds
# that only change application code, not dependencies. `npm ci` installs
# exactly what package-lock.json says (and fails if it's out of sync),
# so every image build gets the same dependency tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_COUPLE_NAMES
ARG VITE_BRIDE_FNAME
ARG VITE_GROOM_FNAME
ARG VITE_WEDDING_DATE
ARG VITE_VENUE_NAME
ARG VITE_VENUE_CITY
ARG VITE_RSVP_DEADLINE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_COUPLE_NAMES=$VITE_COUPLE_NAMES \
    VITE_BRIDE_FNAME=$VITE_BRIDE_FNAME \
    VITE_GROOM_FNAME=$VITE_GROOM_FNAME \
    VITE_WEDDING_DATE=$VITE_WEDDING_DATE \
    VITE_VENUE_NAME=$VITE_VENUE_NAME \
    VITE_VENUE_CITY=$VITE_VENUE_CITY \
    VITE_RSVP_DEADLINE=$VITE_RSVP_DEADLINE

RUN npm run build

# Unprivileged variant: nginx runs as a non-root user and listens on 8080
# (ports below 1024 need root). Same nginx otherwise. 1.30.x = stable line.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
