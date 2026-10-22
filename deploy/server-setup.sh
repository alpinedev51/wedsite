#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu server (Ubuntu 26.04 or 24.04 LTS, x86;
# Hetzner CPX11 or AWS t3a.small) as a deploy target for deploy/deploy.sh.
# Run as root. Safe to re-run: every step checks what's already there.
#
# Normally run on first boot by deploy/cloud-init.yml. By hand:
#   curl -fsSL https://raw.githubusercontent.com/<github-user>/<repo>/main/deploy/server-setup.sh -o setup.sh
#   sudo REPO_URL=https://github.com/<github-user>/<repo>.git bash setup.sh
#
# What it does:
#   - installs security updates, Docker Engine + compose plugin, git, curl
#   - Docker: rotated logs, containers survive a Docker upgrade (live-restore)
#   - 2 GB swap (the CPX11 has 2 GB RAM)
#   - automatic security updates, rebooting at 09:00 UTC (night-time in US time zones) when needed
#   - a non-root admin user ($DEPLOY_USER) with your SSH key, docker + sudo
#   - SSH: keys only, no root login (only once the admin user has a key)
#   - host firewall (ufw): deny all incoming except SSH. The provider's
#     firewall in front (Hetzner Cloud Firewall / AWS security group)
#     should deny everything (see deploy/README.md)
#   - optional Tailscale, for SSH without any open port
#   - /opt/wedsite: sparse checkout + .env (from .env.example, chmod 600)
#
# Settings (environment variables; only REPO_URL is required):
#   DEPLOY_USER        admin user to create             (default: wedsite)
#   SSH_PUBKEY         public key for that user         (default: the keys
#                      the provider installed -- root's on Hetzner, the
#                      `ubuntu` user's on AWS)
#   TAILSCALE_AUTHKEY  join your tailnet with Tailscale SSH (default: skip)
#   REPO_URL           git repo to clone, e.g. https://github.com/<github-user>/<repo>.git
#   APP_DIR            where the app lives              (default: /opt/wedsite)

set -euo pipefail

main() {
	DEPLOY_USER="${DEPLOY_USER:-wedsite}"
	SSH_PUBKEY="${SSH_PUBKEY:-}"
	TAILSCALE_AUTHKEY="${TAILSCALE_AUTHKEY:-}"
	REPO_URL="${REPO_URL:-}"
	APP_DIR="${APP_DIR:-/opt/wedsite}"
	export DEBIAN_FRONTEND=noninteractive

	[ "$(id -u)" -eq 0 ] || die "run as root (sudo bash $0)."
	case "$REPO_URL" in
	"" | *"<"*) die "set REPO_URL to your repo, e.g. REPO_URL=https://github.com/<github-user>/<repo>.git" ;;
	esac
	# shellcheck source=/dev/null
	. /etc/os-release
	[ "${ID:-}" = ubuntu ] || die "this script is for Ubuntu (found: ${ID:-unknown})."

	step_packages
	step_docker
	step_swap
	step_auto_updates
	step_admin_user
	step_ssh
	step_firewall
	step_tailscale
	step_app_dir
	summary
}

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() {
	printf '\033[31mERROR: %s\033[0m\n' "$*" >&2
	exit 1
}

# Write a file only if its content changed. Returns 0 if it changed.
write_if_changed() {
	local path="$1" content
	content="$(cat)"
	if [ -f "$path" ] && [ "$(cat "$path")" = "$content" ]; then
		return 1
	fi
	mkdir -p "$(dirname "$path")"
	printf '%s\n' "$content" >"$path"
	return 0
}

step_packages() {
	log "Updating packages"
	apt-get update -q
	apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
	apt-get -y -q install ca-certificates curl git ufw unattended-upgrades
}

# Docker's own apt repo (Ubuntu's docker.io package lags behind and has no
# compose plugin).
step_docker() {
	log "Installing Docker Engine"
	if [ ! -f /etc/apt/sources.list.d/docker.sources ]; then
		install -m 0755 -d /etc/apt/keyrings
		curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
		chmod a+r /etc/apt/keyrings/docker.asc
		cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${VERSION_CODENAME}
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
		apt-get update -q
	fi
	apt-get -y -q install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

	# Log rotation for every container (compose also sets it per service),
	# and live-restore: containers keep running while dockerd itself
	# restarts, e.g. during an unattended Docker upgrade.
	if write_if_changed /etc/docker/daemon.json <<'EOF'; then
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
EOF
		systemctl restart docker
	fi
	systemctl enable --now docker >/dev/null 2>&1
}

step_swap() {
	log "Swap"
	if swapon --show --noheadings | grep -q .; then
		echo "swap already on: $(swapon --show --noheadings | awk '{print $1, $3}')"
	else
		fallocate -l 2G /swapfile
		chmod 600 /swapfile
		mkswap /swapfile >/dev/null
		swapon /swapfile
		grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
		echo "2 GB swap at /swapfile"
	fi
	# Use swap only under real memory pressure.
	write_if_changed /etc/sysctl.d/99-wedsite-swap.conf <<<'vm.swappiness=10' && sysctl -q --system || true
}

step_auto_updates() {
	log "Automatic security updates"
	write_if_changed /etc/apt/apt.conf.d/20auto-upgrades <<'EOF' || true
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
	# Ubuntu's defaults cover security updates. Add Docker's repo, and
	# reboot for kernel updates at 09:00 UTC, night-time in the US (containers
	# come back on their own: restart: unless-stopped).
	write_if_changed /etc/apt/apt.conf.d/52wedsite-unattended-upgrades <<'EOF' || true
Unattended-Upgrade::Origins-Pattern {
        "origin=Docker";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "09:00";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
EOF
	systemctl enable --now unattended-upgrades >/dev/null 2>&1
}

step_admin_user() {
	log "Admin user: $DEPLOY_USER"
	if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
		useradd --create-home --shell /bin/bash "$DEPLOY_USER"
	fi
	# docker: run deploy.sh without sudo (docker access is root-equivalent
	# anyway). sudo without a password: the account has no password at all,
	# since logins are SSH-key only.
	usermod -aG docker "$DEPLOY_USER"
	write_if_changed "/etc/sudoers.d/90-$DEPLOY_USER" <<<"$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" || true
	chmod 440 "/etc/sudoers.d/90-$DEPLOY_USER"
	visudo -cq

	local home ssh_dir keys
	home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
	ssh_dir="$home/.ssh"
	install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$ssh_dir"
	if [ -n "$SSH_PUBKEY" ]; then
		keys="$SSH_PUBKEY"
	else
		keys="$(provider_keys)"
	fi
	if [ -n "$keys" ]; then
		# Add each key once; keep keys added later by hand.
		touch "$ssh_dir/authorized_keys"
		while IFS= read -r key; do
			[ -n "$key" ] || continue
			grep -qxF "$key" "$ssh_dir/authorized_keys" || printf '%s\n' "$key" >>"$ssh_dir/authorized_keys"
		done <<<"$keys"
		chown "$DEPLOY_USER:$DEPLOY_USER" "$ssh_dir/authorized_keys"
		chmod 600 "$ssh_dir/authorized_keys"
	fi
}

# The key(s) you picked in the provider's console: Hetzner installs them
# for root, AWS for the `ubuntu` user (and puts a "Please login as ubuntu"
# forced command on root's copy). Keep only "<type> <key> [comment]",
# dropping any options/command="..." prefix, so the copy works as a
# normal login for $DEPLOY_USER.
provider_keys() {
	local f
	for f in /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys; do
		[ -s "$f" ] || continue
		grep -oE '(ssh-(ed25519|rsa|dss)|ecdsa-sha2-nistp[0-9]+|sk-(ssh-ed25519|ecdsa-sha2-nistp256)@openssh\.com) [A-Za-z0-9+/=]+( [^"]*)?$' "$f" || true
	done | sort -u
}

step_ssh() {
	log "SSH hardening"
	local home
	home="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
	# Never lock yourself out: only turn off root login once the admin
	# user can log in with a key.
	if [ ! -s "$home/.ssh/authorized_keys" ]; then
		echo "WARNING: $DEPLOY_USER has no SSH key yet -- leaving root login as it is."
		echo "         Re-run with SSH_PUBKEY='ssh-ed25519 ...' to finish hardening."
		return 0
	fi
	if write_if_changed /etc/ssh/sshd_config.d/10-wedsite.conf <<'EOF'; then
# deploy/server-setup.sh: keys only, no root.
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
		sshd -t
		systemctl reload ssh
	fi
	echo "root login off, passwords off -- log in as $DEPLOY_USER"
}

# Second layer behind the Hetzner Cloud Firewall. Docker writes its own
# iptables rules for published ports and skips ufw, which is why compose
# binds Traefik to 127.0.0.1 only.
step_firewall() {
	log "Host firewall (ufw)"
	ufw default deny incoming >/dev/null
	ufw default allow outgoing >/dev/null
	ufw allow OpenSSH >/dev/null
	ufw --force enable >/dev/null
	ufw status verbose | sed -n '1,12p'
}

step_tailscale() {
	if [ -z "$TAILSCALE_AUTHKEY" ]; then
		log "Tailscale: skipped (no TAILSCALE_AUTHKEY)"
		return 0
	fi
	log "Tailscale"
	command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh
	# --ssh: SSH over the tailnet with Tailscale's own auth, so port 22
	# can stay closed in the Hetzner firewall.
	tailscale up --authkey="$TAILSCALE_AUTHKEY" --ssh --hostname=wedsite
	ufw allow in on tailscale0 >/dev/null
	tailscale ip -4 | sed 's/^/tailnet IP: /'
}

# Same steps as deploy/README.md, run as the admin user.
step_app_dir() {
	log "App directory: $APP_DIR"
	install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
	if [ ! -d "$APP_DIR/.git" ]; then
		sudo -u "$DEPLOY_USER" git clone --quiet --filter=blob:none --no-checkout "$REPO_URL" "$APP_DIR"
		sudo -u "$DEPLOY_USER" git -C "$APP_DIR" sparse-checkout set --no-cone \
			/docker-compose.yml /traefik/ /deploy/ /.env.example
		sudo -u "$DEPLOY_USER" git -C "$APP_DIR" checkout --quiet main
	fi
	if [ ! -f "$APP_DIR/.env" ]; then
		install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/.env.example" "$APP_DIR/.env"
		echo "created $APP_DIR/.env from .env.example -- fill it in"
	else
		echo "$APP_DIR/.env already exists -- left as is"
	fi
}

summary() {
	log "Server ready"
	cat <<EOF
Docker:  $(docker --version)
Compose: $(docker compose version --short)
Swap:    $(swapon --show --noheadings | awk '{print $3}' | head -1)

Next (as $DEPLOY_USER):
  1. nano $APP_DIR/.env        fill in every value (see deploy/README.md)
  2. $APP_DIR/deploy/deploy.sh
  3. Cloudflare: tunnel public hostname -> http://traefik:80
EOF
}

main "$@"
