# Deploying

```
git push (main) ──► GitHub Actions ──► ghcr.io/alpinedev51/wedsite/{service-wed,ui-wed}:sha-<commit>
                    secret scan,                         │
                    build images                         │ docker pull
                                                         ▼
                              server: /opt/wedsite  (deploy/deploy.sh)
                              sparse checkout of the same commit:
                              docker-compose.yml, traefik/, deploy/  +  .env (never in git)
```

The server never builds anything and holds no source code. It has the
compose file, the Traefik config, this folder, and its own `.env`.

## What goes where

| Value | Lives in | Used |
|---|---|---|
| Secrets and runtime config (tunnel token, Postgres password, Resend keys, `PUBLIC_SITE_URL`, admin and wedding seed values, …) | server `.env` | when containers start |
| `IMAGE_REPO` | server `.env` | which registry to pull from |
| `IMAGE_TAG` | server `.env`, **written by deploy.sh** | which build is running |
| Frontend fallback text: `COUPLE_NAMES`, `BRIDE_FNAME`, `GROOM_FNAME`, `WEDDING_DATE`, `VENUE_NAME`, `VENUE_CITY`, `RSVP_DEADLINE` | GitHub repo **variables** | baked into the ui-wed image by CI |
| `MILESTONES_JSON` (optional: the real Our Story timeline) | GitHub repo variable | baked into ui-wed by CI |

`WEDDING_DATE`, `VENUE_*` and the rest also live in the server `.env`, because
service-wed uses them to seed the database on first boot. After that, the
wedding details are edited in the admin UI, and the live site reads them
from the API. The baked-in copies are only fallback text shown while the API
answers.

## One-time GitHub setup

1. **Settings → Secrets and variables → Actions → Variables**: add the build-time
   variables from the table above, using the same values as your `.env`.
2. Push to `main` and let the **CI** workflow finish. The first run creates two
   packages under your profile: `wedsite/service-wed` and `wedsite/ui-wed`.
3. Make both packages **public** (package → Package settings → Change
   visibility). The images contain nothing that isn't already public: the
   backend code is in this public repo, and the frontend values are shown on
   the site. The server then needs no GitHub credentials.
   *If you'd rather keep them private:* create a classic personal access token
   with only `read:packages`, then run this on the server:
   `echo <token> | docker login ghcr.io -u alpinedev51 --password-stdin`.

## One-time server setup

Prerequisites: Docker Engine with the compose plugin, plus git and curl.

```bash
sudo mkdir -p /opt/wedsite && sudo chown "$USER": /opt/wedsite
git clone --filter=blob:none --no-checkout https://github.com/alpinedev51/wedsite.git /opt/wedsite
cd /opt/wedsite
git sparse-checkout set --no-cone /docker-compose.yml /traefik/ /deploy/ /.env.example
git checkout main

cp .env.example .env
chmod 600 .env
nano .env        # fill in every runtime value; IMAGE_REPO=ghcr.io/alpinedev51/wedsite

deploy/deploy.sh
```

In the Cloudflare Zero Trust dashboard, point the tunnel's public hostname
at **`http://traefik:80`**.

## Day to day

```bash
deploy/deploy.sh               # deploy the newest commit on main
deploy/deploy.sh <commit>      # deploy a specific commit (full or short SHA)
deploy/deploy.sh status        # what's running, health, recent deploys
deploy/deploy.sh rollback      # back to the previous successful deploy
```

Each CI run on `main` prints the exact deploy command in its run summary.
Deploys first take a database dump (`.deploy/backups/`, newest 10 kept),
because migrations run on start and switching images back doesn't undo them.

### Changing configuration

- **A runtime value** (anything in `.env`): edit `.env`, then run
  `docker compose up -d` from `/opt/wedsite`. Only the containers whose
  settings changed are recreated. `ADMIN_*` and the wedding values only
  seed an empty database; after the first boot, change those in the admin UI.
- **A build-time value**: change the GitHub variable, re-run the CI workflow
  (Actions → CI → Run workflow on `main`), then run `deploy/deploy.sh`.

### Restoring a pre-deploy dump

```bash
cd /opt/wedsite
docker compose stop service-wed worker
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < .deploy/backups/<file>.dump
docker compose start service-wed worker
```

## Testing

### In GitHub
- **Actions → CI → Run workflow** (branch `main`) runs the secret scan, builds
  both images and pushes them. Pushing to `main` does the same automatically.
  A run on any other branch, or on a pull request, builds without pushing.
- Check the run's summary page for the deploy command, and look under
  **Packages** for `wedsite/service-wed` and `wedsite/ui-wed`, each tagged
  `sha-<commit>` and `latest`.
- For a pull request, the secret scan and both image builds are the checks.

### On your machine: a simulated server
`deploy/local-server-sim.sh` sets up a folder (`~/wedsite-sim`) exactly the
way the server is set up above, and you run the real `deploy.sh` in it. The
differences: the tunnel container is replaced by one that does nothing,
email and tunnel credentials are dummies, and the site is at
`http://localhost`. It uses the same container names as the local dev
stack, so stop that first.

```bash
# The real pipeline: git from GitHub, images from GHCR (run CI first)
deploy/local-server-sim.sh setup ghcr
~/wedsite-sim/deploy/deploy.sh            # then status / rollback / <commit>

# Before pushing anything: committed local main, images built here
deploy/local-server-sim.sh setup local    # builds + publishes main's images
~/wedsite-sim/deploy/deploy.sh
# ...commit more, then:
deploy/local-server-sim.sh publish && ~/wedsite-sim/deploy/deploy.sh

deploy/local-server-sim.sh teardown       # removes everything it created
```

Worth trying: a deploy, `status`, a second deploy, `rollback`, and a
deploy of a commit CI hasn't built (it should stop and change nothing).

## Local builds

These still work from a full checkout: `docker compose up -d --build`
(leave out `cloudflared` so a local build never joins the production
tunnel). `IMAGE_REPO` can be anything locally.
