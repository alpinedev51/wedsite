#!/usr/bin/env bash
# A stand-in for the production server on your own machine, for trying
# deploy/deploy.sh before (or without) touching the real one. The simulated
# server is set up exactly like deploy/README.md describes and runs the real
# deploy.sh. The only differences:
#   - cloudflared is swapped for a container that just sleeps
#     (deploy/local-sim.yml), so nothing joins the real tunnel
#   - RESEND_API_KEY / CLOUDFLARE_TUNNEL_TOKEN are dummies: no email can be
#     sent, no tunnel can connect
#   - the site is at http://localhost (HTTP_PORT from your .env)
#
# Two modes:
#   ghcr   the real pipeline: git from GitHub, images CI pushed to GHCR.
#          Push to main / run the CI workflow first. Needs the GHCR
#          packages public (or `docker login ghcr.io`). Uses this
#          checkout's `origin` remote and IMAGE_REPO from its .env.
#   local  no GitHub: git from this checkout's committed `main`, images
#          built here (like CI would) and pushed to a throwaway registry
#          on localhost:5000.
#
# Usage:
#   deploy/local-server-sim.sh setup [ghcr|local]   create the simulated server
#   deploy/local-server-sim.sh publish              local mode: build + push main's images
#   deploy/local-server-sim.sh teardown             remove everything this created
#
# Then drive it like the real server:
#   ~/wedsite-sim/deploy/deploy.sh            (or: status, rollback, <commit>)
#
# Values (DB password, wedding details, ...) come from this checkout's root
# .env. Location: $SIM_DIR (default ~/wedsite-sim). Uses the same container
# names as the local dev stack, so stop that first.

set -euo pipefail

main() {
	REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
	SIM_DIR="${SIM_DIR:-$HOME/wedsite-sim}"
	# ghcr mode: git from this checkout's `origin` remote, images from
	# IMAGE_REPO in this checkout's .env (where CI pushes them,
	# ghcr.io/<github-user>/<repo>).
	GITHUB_URL="$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || true)"
	GHCR_REPO=""
	[ ! -f "$REPO_DIR/.env" ] || GHCR_REPO="$(env_get "$REPO_DIR/.env" IMAGE_REPO)"
	REGISTRY_CONTAINER="wedsite-sim-registry"
	REGISTRY_IMAGE="registry:3.0.0"
	LOCAL_REPO="localhost:5000/wedsite"

	case "${1:-}" in
	setup) cmd_setup "${2:-ghcr}" ;;
	publish) cmd_publish ;;
	teardown) cmd_teardown ;;
	*)
		sed -n '2,31p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
		exit 1
		;;
	esac
}

log() { printf '\033[1m==> %s\033[0m\n' "$*"; }
die() {
	printf '\033[31mERROR: %s\033[0m\n' "$*" >&2
	exit 1
}

# Value of KEY in a dotenv file (last one wins, quotes stripped).
env_get() {
	local line
	line="$(grep -E "^$2=" "$1" | tail -n 1 || true)"
	line="${line#*=}"
	line="${line%\"}"
	line="${line#\"}"
	printf '%s' "$line"
}

# Set KEY=VALUE in a dotenv file, replacing every existing KEY= line.
env_set() {
	local file="$1" key="$2" value="$3" tmp
	tmp="$(mktemp "$file.XXXXXX")"
	grep -vE "^$key=" "$file" >"$tmp" || true
	printf '%s=%s\n' "$key" "$value" >>"$tmp"
	chmod 600 "$tmp"
	mv "$tmp" "$file"
}

sim_mode() { cat "$SIM_DIR/.deploy-sim-mode" 2>/dev/null || true; }

cmd_setup() {
	local mode="$1" origin repo port
	case "$mode" in
	ghcr)
		[ -n "$GITHUB_URL" ] || die "ghcr mode clones this checkout's origin remote, and there isn't one."
		case "$GHCR_REPO" in
		ghcr.io/*/*) ;;
		*) die "ghcr mode pulls from IMAGE_REPO in $REPO_DIR/.env; set it to ghcr.io/<github-user>/<repo> (found: '${GHCR_REPO:-none}')." ;;
		esac
		origin="$GITHUB_URL" repo="$GHCR_REPO"
		;;
	local) origin="file://$REPO_DIR" repo="$LOCAL_REPO" ;;
	*) die "mode must be ghcr or local" ;;
	esac

	[ ! -e "$SIM_DIR" ] || die "$SIM_DIR already exists. Run teardown first."
	[ -f "$REPO_DIR/.env" ] || die "$REPO_DIR/.env not found -- the simulation takes its values from it."
	if docker ps --format '{{.Names}}' | grep -qE '^(wedding_|service-wed|ui-wed)'; then
		die "the local dev stack is running (same container names). Stop it first: docker compose down"
	fi

	log "Creating simulated server in $SIM_DIR ($mode mode), following deploy/README.md"
	git clone --quiet --filter=blob:none --no-checkout "$origin" "$SIM_DIR" 2>/dev/null ||
		git clone --quiet --no-checkout "$origin" "$SIM_DIR"
	git -C "$SIM_DIR" sparse-checkout set --no-cone /docker-compose.yml /traefik/ /deploy/ /.env.example
	git -C "$SIM_DIR" checkout --quiet main
	[ -f "$SIM_DIR/deploy/deploy.sh" ] ||
		die "main at $origin has no deploy/deploy.sh yet -- push/commit it first."
	echo "$mode" >"$SIM_DIR/.deploy-sim-mode"
	# Keep the marker out of `git status` in the simulated checkout.
	echo ".deploy-sim-mode" >>"$SIM_DIR/.git/info/exclude"

	log "Writing .env (your values, with dummy tunnel/email credentials)"
	cp "$REPO_DIR/.env" "$SIM_DIR/.env"
	chmod 600 "$SIM_DIR/.env"
	port="$(env_get "$SIM_DIR/.env" HTTP_PORT)"
	env_set "$SIM_DIR/.env" CLOUDFLARE_TUNNEL_TOKEN "sim-not-a-real-token"
	env_set "$SIM_DIR/.env" RESEND_API_KEY "re_sim_not_a_real_key"
	env_set "$SIM_DIR/.env" PUBLIC_SITE_URL "http://localhost:${port:-80}"
	env_set "$SIM_DIR/.env" IMAGE_REPO "$repo"
	env_set "$SIM_DIR/.env" COMPOSE_FILE "docker-compose.yml:deploy/local-sim.yml"
	[ -n "$(env_get "$SIM_DIR/.env" RESEND_WEBHOOK_SECRET)" ] ||
		env_set "$SIM_DIR/.env" RESEND_WEBHOOK_SECRET "whsec_c2ltLW5vdC1yZWFs"
	[ -n "$(env_get "$SIM_DIR/.env" RESEND_FROM_ADDRESS)" ] ||
		env_set "$SIM_DIR/.env" RESEND_FROM_ADDRESS "sim@example.com"

	if [ "$mode" = local ]; then
		cmd_publish
	fi

	echo
	log "Ready. Deploy with:"
	echo "    $SIM_DIR/deploy/deploy.sh"
	echo "  then open http://localhost:${port:-80}  (status / rollback / <commit> work too)"
	[ "$mode" = local ] && echo "  After new commits on main: deploy/local-server-sim.sh publish, then deploy again."
	echo "  Clean up: deploy/local-server-sim.sh teardown"
}

# Build main's images like CI does (from the committed tree only, with the
# build-time values from .env standing in for the GitHub variables) and
# push them to the throwaway registry.
cmd_publish() {
	[ "$(sim_mode)" = local ] || die "publish is for local mode (in ghcr mode, CI publishes)."
	local sha tag src key args=()
	sha="$(git -C "$REPO_DIR" rev-parse main)"
	tag="sha-$sha"
	if [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]; then
		printf '\033[33mNOTE: uncommitted changes are not included -- building committed main (%s).\033[0m\n' "${sha:0:7}"
	fi

	if [ -z "$(docker ps --quiet --filter "name=^${REGISTRY_CONTAINER}$")" ]; then
		log "Starting throwaway registry on localhost:5000"
		docker rm -f "$REGISTRY_CONTAINER" >/dev/null 2>&1 || true
		docker run -d --name "$REGISTRY_CONTAINER" -p 127.0.0.1:5000:5000 "$REGISTRY_IMAGE" >/dev/null
	fi

	src="$(mktemp -d)"
	# shellcheck disable=SC2064 # expand $src now
	trap "rm -rf '$src'" RETURN
	git -C "$REPO_DIR" archive main | tar -x -C "$src"
	# CI writes the MILESTONES_JSON variable here; locally, use the real
	# file if you have one.
	if [ -f "$REPO_DIR/ui-wed/src/config/milestones.json" ]; then
		cp "$REPO_DIR/ui-wed/src/config/milestones.json" "$src/ui-wed/src/config/milestones.json"
	fi
	for key in COUPLE_NAMES BRIDE_FNAME GROOM_FNAME WEDDING_DATE VENUE_NAME VENUE_CITY RSVP_DEADLINE; do
		args+=(--build-arg "VITE_$key=$(env_get "$REPO_DIR/.env" "$key")")
	done

	log "Building service-wed for main (${sha:0:7})"
	docker build --quiet --platform linux/amd64 -t "$LOCAL_REPO/service-wed:$tag" "$src/service-wed" >/dev/null
	log "Building ui-wed for main (${sha:0:7})"
	docker build --quiet --platform linux/amd64 "${args[@]}" -t "$LOCAL_REPO/ui-wed:$tag" "$src/ui-wed" >/dev/null

	log "Pushing to localhost:5000"
	docker push --quiet "$LOCAL_REPO/service-wed:$tag" >/dev/null
	docker push --quiet "$LOCAL_REPO/ui-wed:$tag" >/dev/null
	# Drop the local copies so deploy.sh has to pull, like the real server.
	docker rmi "$LOCAL_REPO/service-wed:$tag" "$LOCAL_REPO/ui-wed:$tag" >/dev/null
	log "Published $tag"
}

# Removes only what setup/publish/deploy created for the simulation.
cmd_teardown() {
	if [ -f "$SIM_DIR/docker-compose.yml" ]; then
		log "Stopping the simulated stack and deleting its data"
		(cd "$SIM_DIR" && env -i HOME="$HOME" PATH="$PATH" docker compose down -v --remove-orphans) || true
	fi
	log "Removing simulation images"
	docker image ls --format '{{.Repository}}:{{.Tag}}' |
		grep -E "^(${LOCAL_REPO}|${GHCR_REPO})/(service-wed|ui-wed):" |
		xargs -r docker rmi >/dev/null 2>&1 || true
	# -v: also the registry's anonymous storage volume.
	docker rm -fv "$REGISTRY_CONTAINER" >/dev/null 2>&1 || true
	if [ -d "$SIM_DIR" ]; then
		log "Deleting $SIM_DIR"
		rm -rf "$SIM_DIR"
	fi
	log "Done."
}

main "$@"
