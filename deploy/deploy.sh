#!/usr/bin/env bash
# Deploys a CI-built commit on the server. Nothing is built here: the images
# come from GHCR (built by .github/workflows/ci.yml), and the compose file +
# Traefik config come from the same commit via a sparse git checkout, so
# config and images always match.
#
# Usage (from anywhere; the script finds its own checkout):
#   deploy/deploy.sh [<commit>]   deploy a commit on main (default: newest main)
#   deploy/deploy.sh rollback     redeploy the previous successful deploy
#   deploy/deploy.sh status       what's deployed and whether it's healthy
#
# Each deploy:
#   1. checks .env has what the stack needs
#   2. checks out that commit's docker-compose.yml / traefik/ / deploy/
#   3. pulls sha-<commit> images (stops here, untouched, if CI hasn't
#      published them)
#   4. dumps the database to .deploy/backups/ (migrations run on start and
#      can't be undone by switching images back)
#   5. writes IMAGE_TAG into .env, so a plain `docker compose up -d` later
#      starts the same version
#   6. starts the stack and waits for health checks, then smoke-tests
#      the site through Traefik
#
# First-time server setup: see deploy/README.md.

set -euo pipefail

# Everything is inside main(), called on the last line: bash then reads the
# whole script before running any of it. Step 2 replaces this very file
# with the target commit's version, which would otherwise corrupt a script
# bash is still reading line by line.
main() {
	REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
	cd "$REPO_DIR"

	STATE_DIR="$REPO_DIR/.deploy"
	HISTORY_FILE="$STATE_DIR/history"
	BACKUP_DIR="$STATE_DIR/backups"
	BACKUPS_TO_KEEP=10
	ENV_FILE="$REPO_DIR/.env"

	mkdir -p "$BACKUP_DIR"
	chmod 700 "$STATE_DIR" "$BACKUP_DIR"

	case "${1:-}" in
	status) cmd_status ;;
	rollback) cmd_rollback ;;
	-h | --help | help) usage ;;
	*) cmd_deploy "${1:-}" ;;
	esac
}

usage() {
	sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

log() { printf '\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARN: %s\033[0m\n' "$*" >&2; }
die() {
	printf '\033[31mERROR: %s\033[0m\n' "$*" >&2
	exit 1
}

# docker compose with a clean environment: only .env decides the config.
# Otherwise a variable left exported in the shell (IMAGE_TAG, say) silently
# beats the value in .env -- compose's precedence rule. DC_ENV holds the
# one deliberate override (the target IMAGE_TAG while pulling).
DC_ENV=()
dc() {
	env -i HOME="$HOME" PATH="$PATH" ${DOCKER_HOST:+DOCKER_HOST="$DOCKER_HOST"} \
		${DOCKER_CONFIG:+DOCKER_CONFIG="$DOCKER_CONFIG"} "${DC_ENV[@]}" \
		docker compose --project-directory "$REPO_DIR" "$@"
}

# Value of KEY in .env (last one wins, quotes stripped), or empty.
env_get() {
	local line
	line="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 || true)"
	line="${line#*=}"
	line="${line%\"}"
	line="${line#\"}"
	printf '%s' "$line"
}

# Set KEY=VALUE in .env in place, keeping the file's permissions.
env_set() {
	local key="$1" value="$2" tmp
	tmp="$(mktemp "$ENV_FILE.XXXXXX")"
	if grep -qE "^$key=" "$ENV_FILE"; then
		sed -E "s|^$key=.*|$key=$value|" "$ENV_FILE" >"$tmp"
	else
		cat "$ENV_FILE" >"$tmp"
		printf '\n%s=%s\n' "$key" "$value" >>"$tmp"
	fi
	chmod --reference="$ENV_FILE" "$tmp"
	mv "$tmp" "$ENV_FILE"
}

preflight() {
	command -v docker >/dev/null || die "docker is not installed."
	docker compose version >/dev/null 2>&1 || die "the docker compose plugin is not installed."
	command -v curl >/dev/null || die "curl is not installed."
	[ -f "$ENV_FILE" ] || die "$ENV_FILE not found. Copy .env.example to .env and fill it in (deploy/README.md)."

	if [ "$(stat -c '%a' "$ENV_FILE")" != "600" ]; then
		warn ".env is readable by other users; fixing (chmod 600)."
		chmod 600 "$ENV_FILE"
	fi

	local missing=() key
	for key in CLOUDFLARE_TUNNEL_TOKEN POSTGRES_PASSWORD PUBLIC_SITE_URL IMAGE_REPO \
		RESEND_API_KEY RESEND_FROM_ADDRESS RESEND_WEBHOOK_SECRET; do
		[ -n "$(env_get "$key")" ] || missing+=("$key")
	done
	[ ${#missing[@]} -eq 0 ] || die "missing in .env: ${missing[*]}"

	# Must name a registry (first part has a dot or port, like ghcr.io/...),
	# not a bare local-build name like "wed-website" that can't be pulled.
	local repo_host
	repo_host="$(env_get IMAGE_REPO)"
	repo_host="${repo_host%%/*}"
	case "$repo_host" in
	*.* | *:*) ;;
	*) die "IMAGE_REPO must be the registry path CI pushes to, e.g. ghcr.io/alpinedev51/wedsite" ;;
	esac
	case "$(env_get PUBLIC_SITE_URL)" in
	https://*) ;;
	*) warn "PUBLIC_SITE_URL isn't https:// -- RSVP links in emails will use it as-is." ;;
	esac

	# Validates the compose file against .env (missing ${VAR:?} etc.).
	dc config --quiet || die "docker compose config failed (see above)."
}

# Smoke test through Traefik on the loopback port, as Cloudflare would.
smoke_test() {
	local port base
	port="$(env_get HTTP_PORT)"
	base="http://127.0.0.1:${port:-80}"
	curl -fsS --max-time 10 "$base/api/v1/health/ready" >/dev/null || return 1
	curl -fsS --max-time 10 -o /dev/null "$base/" || return 1
}

# Traefik reports healthy a few seconds before it has discovered the app
# containers (it answers 404 until then), so retry for up to a minute.
wait_for_site() {
	local _
	for _ in $(seq 1 30); do
		smoke_test 2>/dev/null && return 0
		sleep 2
	done
	smoke_test # once more, letting curl print why it fails
}

backup_db() {
	local label="$1" file
	if [ -z "$(dc ps --status running --quiet db 2>/dev/null)" ]; then
		log "Database not running yet (first deploy?) -- skipping pre-deploy backup."
		return 0
	fi
	file="$BACKUP_DIR/predeploy-$(date -u +%Y%m%dT%H%M%SZ)-${label}.dump"
	log "Backing up database to ${file#"$REPO_DIR"/}"
	# Custom format (-Fc): compressed, restorable with pg_restore. Uses the
	# credentials already inside the db container (single quotes on purpose:
	# $POSTGRES_USER/$POSTGRES_DB expand in there, not here).
	# shellcheck disable=SC2016
	if ! dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$file"; then
		rm -f "$file"
		die "database backup failed -- not deploying."
	fi
	chmod 600 "$file"
	# Keep the newest $BACKUPS_TO_KEEP.
	find "$BACKUP_DIR" -maxdepth 1 -name 'predeploy-*.dump' -printf '%T@ %p\n' |
		sort -rn | tail -n +$((BACKUPS_TO_KEEP + 1)) | cut -d' ' -f2- | xargs -r rm -f
}

cmd_deploy() {
	local ref="${1:-}" sha tag prev_sha prev_tag
	preflight

	log "Fetching origin"
	git fetch --quiet --prune origin
	ref="${ref:-origin/main}"
	[ "$ref" = latest ] && ref=origin/main
	sha="$(git rev-parse --verify --quiet "${ref}^{commit}")" ||
		die "unknown commit: $ref"
	# CI only publishes images for commits on main.
	git merge-base --is-ancestor "$sha" origin/main ||
		die "$sha is not on main -- CI only publishes images for main."

	tag="sha-$sha"
	prev_sha="$(git rev-parse HEAD)"
	prev_tag="$(env_get IMAGE_TAG)"

	# No "already deployed" shortcut: re-running CI on the same commit (e.g.
	# after changing a build-time GitHub variable) republishes the same tag
	# with new contents. Compose only recreates containers whose image
	# actually changed, so redeploying an unchanged tag is a quick no-op.
	log "Deploying $(git log -1 --format='%h %s' "$sha")"

	# Config first, so the pull below uses the target commit's service list.
	git -c advice.detachedHead=false checkout --quiet --detach "$sha"

	log "Pulling images for $tag"
	if ! pull_images "$tag"; then
		git checkout --quiet --detach "$prev_sha"
		die "couldn't pull $tag. Has CI finished for this commit, and can this server reach ghcr.io (package public, or docker login)? Nothing was changed."
	fi

	backup_db "${prev_tag:-none}"

	env_set IMAGE_TAG "$tag"

	log "Starting the stack"
	if ! dc up -d --no-build --remove-orphans --wait --wait-timeout 180; then
		dc ps
		dc logs --tail 40 service-wed worker ui-wed traefik || true
		die "stack didn't become healthy. Logs above. To go back: deploy/deploy.sh rollback"
	fi

	log "Smoke test"
	if ! wait_for_site; then
		die "site didn't respond through Traefik. Check: docker compose logs traefik service-wed. To go back: deploy/deploy.sh rollback"
	fi

	printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sha" "$tag" >>"$HISTORY_FILE"

	remove_old_app_images

	log "Deployed $tag"
}

# Pull every image at the target tag. .env's IMAGE_TAG isn't changed until
# this has succeeded, so the tag is passed in for the pull only.
pull_images() {
	local repo
	repo="$(env_get IMAGE_REPO)"
	# The two app images explicitly: compose treats a failed pull of a
	# service that has a build: section as a warning, which would hide a
	# missing tag.
	docker pull --quiet "$repo/service-wed:$1" >/dev/null || return 1
	docker pull --quiet "$repo/ui-wed:$1" >/dev/null || return 1
	# Everything else (Postgres, Traefik, cloudflared, ...).
	DC_ENV=(IMAGE_TAG="$1")
	dc pull --quiet --ignore-buildable || {
		DC_ENV=()
		return 1
	}
	DC_ENV=()
}

# Remove this app's images from older deploys, keeping the last 3 for a
# fast rollback (anything removed is just pulled again if needed). Only
# touches $IMAGE_REPO/{service-wed,ui-wed}:sha-* -- never other images on
# the machine.
remove_old_app_images() {
	local repo keep img
	repo="$(env_get IMAGE_REPO)"
	keep="$(tail -n 3 "$HISTORY_FILE" | awk '{print $3}')"
	docker image ls --format '{{.Repository}}:{{.Tag}}' |
		grep -E "^${repo}/(service-wed|ui-wed):sha-" |
		while read -r img; do
			grep -qxF "${img##*:}" <<<"$keep" || docker rmi "$img" >/dev/null 2>&1 || true
		done
}

cmd_rollback() {
	[ -f "$HISTORY_FILE" ] || die "no deploy history yet."
	local current previous
	current="$(env_get IMAGE_TAG)"
	# Newest successful deploy that isn't the current one.
	previous="$(awk '{print $2, $3}' "$HISTORY_FILE" | tac |
		awk -v cur="$current" '$2 != cur {print $1; exit}')"
	[ -n "$previous" ] || die "no earlier deploy to roll back to."

	warn "Rolling back to ${previous:0:12}. Images and config go back; the database does NOT."
	warn "If the release you're leaving ran a migration, the old code may not match the schema."
	warn "Pre-deploy dumps are in .deploy/backups/ (restore: deploy/README.md)."
	cmd_deploy "$previous"
}

cmd_status() {
	local tag
	tag="$(env_get IMAGE_TAG 2>/dev/null || true)"
	echo "Deployed tag : ${tag:-<none>}"
	echo "Config commit: $(git log -1 --format='%h %s (%cr)' HEAD)"
	echo
	dc ps --format 'table {{.Service}}\t{{.Status}}'
	echo
	if smoke_test 2>/dev/null; then echo "Smoke test   : OK"; else echo "Smoke test   : FAILING"; fi
	if [ -f "$HISTORY_FILE" ]; then
		echo
		echo "Recent deploys:"
		tail -n 5 "$HISTORY_FILE" | sed 's/^/  /'
	fi
}

main "$@"
