# Multi-stage build: compile the Vite app, then serve the static output with
# nginx -- mirrors service-wed's own builder/runner Dockerfile pattern.
FROM node:26-alpine AS builder

WORKDIR /app

# Copy dependency definitions first so `npm install` is cached across builds
# that only change application code, not dependencies.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ARG VITE_COUPLE_NAMES
ARG VITE_BRIDE_FNAME
ARG VITE_GROOM_FNAME
ARG VITE_WEDDING_DATE
ARG VITE_VENUE_NAME
ARG VITE_VENUE_CITY
ARG VITE_RSVP_DEADLINE
ENV VITE_COUPLE_NAMES=$VITE_COUPLE_NAMES \
    VITE_BRIDE_FNAME=$VITE_BRIDE_FNAME \
    VITE_GROOM_FNAME=$VITE_GROOM_FNAME \
    VITE_WEDDING_DATE=$VITE_WEDDING_DATE \
    VITE_VENUE_NAME=$VITE_VENUE_NAME \
    VITE_VENUE_CITY=$VITE_VENUE_CITY \
    VITE_RSVP_DEADLINE=$VITE_RSVP_DEADLINE

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
