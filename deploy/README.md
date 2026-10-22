# Deploying

```
git push (main) ──► GitHub Actions ──► ghcr.io/<github-user>/<repo>/{service-wed,ui-wed}:sha-<commit>
                    secret scan,                         │
                    build images                         │ docker pull
                                                         ▼
                              server: /opt/wedsite  (deploy/deploy.sh)
                              sparse checkout of the same commit:
                              docker-compose.yml, traefik/, deploy/  +  .env (never in git)
```

The server never builds anything and holds no source code. It has the
compose file, the Traefik config, this folder, and its own `.env`.

The pipeline and the deploy steps are the same whichever host you choose.
Only creating the server differs: **[Hetzner](#option-a-hetzner)** or
**[AWS](#option-b-aws)**.

## CI/CD pipeline

`.github/workflows/ci.yml`:

| Trigger | Secret scan + checks | Build images | Push to GHCR |
|---|---|---|---|
| Pull request | yes | yes | no |
| Push to `main` | yes | yes | yes |
| Actions → CI → Run workflow on `main` | yes | yes | yes |
| Run workflow on another branch | yes | yes | no |

1. **Secret scan:** TruffleHog scans the whole git history. It fails the
   run on any credential that the provider confirms works, or that can't be
   checked.
   **Checks** run alongside it: `ruff`, `mypy` and the `pytest` tests for
   service-wed, `eslint` and `prettier` for ui-wed. Any failure stops the
   build.
2. **Build:** `service-wed` and `ui-wed`, for `linux/amd64`. The worker runs
   the `service-wed` image, so there's no third image. ui-wed's fallback text
   comes from GitHub repository variables (below).
3. **Push:** to `ghcr.io/<github-user>/<repo>/<image>`, tagged
   `sha-<full commit sha>` and `latest`. The run summary prints the deploy
   command.
4. **Deploy (CD):** manual, on purpose. Nothing reaches guests until you run
   `deploy/deploy.sh` on the server. It deploys a commit, not `latest`, so
   you always know exactly what's live, and a rollback is one command.

The server pulls from GHCR over the internet on both Hetzner and AWS, so
nothing in the pipeline changes between hosts. **One constraint:** CI builds
x86 images only. Use an x86 server (Hetzner CPX, AWS t3/t3a). For AWS
Graviton (t4g), add `linux/arm64` to `platforms:` in the workflow, plus a
`docker/setup-qemu-action` step before buildx.

Actions in the workflow are pinned to exact commit hashes (the comment next
to each says which release). Dependabot (`.github/dependabot.yml`) opens a
monthly grouped pull request per ecosystem: actions, Dockerfile base
images, compose images, npm and uv packages (major versions are skipped for
images; a Postgres major needs a dump/restore). Merge once CI passes, then
deploy. Turn on **Settings → Code security → Dependabot security updates**
too, so security fixes arrive straight away instead of monthly.

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
   `echo <token> | docker login ghcr.io -u <github-user> --password-stdin`.

## Choose a host

| | Hetzner | AWS |
|---|---|---|
| Server | CPX11: 2 vCPU, 2 GB, 40 GB disk | t3a.small: 2 vCPU, 2 GB, 30 GB gp3 disk |
| Region | Hillsboro, OR | us-west-2 (Oregon) |
| Approx. cost | ~$6–8/mo all-in | ~$20/mo: instance ~$14, disk ~$2.40, public IPv4 ~$3.65 |
| Firewall | Hetzner Cloud Firewall | Security group |
| Shell access without open ports | Tailscale | Tailscale, or SSM Session Manager (built in) |
| Server backups | Hetzner Backups (+20% of server price) | EBS snapshots via Data Lifecycle Manager |

Prices are approximate on-demand rates; check the provider's pricing before
you commit. Either host easily handles this site; the stack uses about
700 MB of RAM. Hetzner is cheaper. AWS gives you IAM, SSM and snapshot
tooling, plus AWS experience. On AWS, a 1-year Compute Savings Plan cuts
the instance cost by roughly a third and fits the time until the wedding.

## One-time server setup

### Option A: Hetzner

**1. Firewall.** In the Hetzner Console, go to **Firewalls → Create Firewall**:
- **Inbound:** delete the default rules, so nothing is allowed in. Guests
  arrive through the Cloudflare tunnel, which only connects *outward*.
  - Plain SSH: add one rule, TCP 22 from **your IP only**.
  - Tailscale: no inbound rules at all.
- **Outbound:** leave everything allowed (GitHub, GHCR, Cloudflare, Resend,
  Ubuntu updates).

**2. Server.** Go to **Servers → Add Server**:
- Location **Hillsboro, OR**, image **Ubuntu 26.04**, type **CPX11**
  (shared vCPU, x86).
- SSH key: yours. (Add it under Security → SSH Keys first.)
- Firewall: the one from step 1.
- **Cloud config:** paste `deploy/cloud-init.yml`, after setting `REPO` in
  it to your GitHub repo (`<github-user>/<repo>`). To use Tailscale, put a
  one-time auth key in it too.
- Optional: enable **Backups** (daily server images, 7 kept).

Then continue with [Both hosts: configure and deploy](#both-hosts-configure-and-deploy).

### Option B: AWS

Everything below is in the **us-west-2 (Oregon)** region.

**1. Budget alert.** Go to **Billing → Budgets → Create budget** and make a
monthly cost budget of about $25 that emails you. That way, a forgotten
resource doesn't surprise you.

**2. Shell access.** Pick one:
- **SSM Session Manager (recommended):** no open port and no SSH key. Go to
  **IAM → Roles → Create role**: trusted entity *EC2*, policy
  `AmazonSSMManagedInstanceCore`, name `wedsite-ssm`. Ubuntu images on AWS
  already include the SSM agent.
- **SSH:** in **EC2 → Key Pairs**, import your public key (or create a
  pair).
- **Tailscale:** works as on Hetzner, using the auth key in the cloud config.

**3. Security group.** Go to **EC2 → Security Groups → Create**, name
`wedsite`:
- **Inbound:** none with SSM or Tailscale; for plain SSH, TCP 22 from
  **My IP** only.
- **Outbound:** leave the default (all).

**4. Launch the instance.** Go to **EC2 → Launch instance**:
- Name `wedsite`. Under **Add additional tags**, set the `Name` tag's
  resource types to **Instances and Volumes**, so the disk is tagged too
  (step 5 finds it by that tag).
- AMI: click the **Ubuntu** tile, then **Ubuntu Server 26.04 LTS**, 64-bit
  **(x86)**, from Canonical. The wizard preselects Amazon Linux, which the
  setup script refuses (it stops with "this script is for Ubuntu").
- Instance type **t3a.small** (or t3.small). Not t4g; see the
  [architecture note](#cicd-pipeline).
- Key pair: yours if you're using SSH, otherwise *Proceed without*.
- Network: the default VPC, a public subnet, **auto-assign public IP:
  enabled**. The server needs outbound internet to reach GitHub, GHCR,
  Cloudflare and Resend. Nothing connects in, so no Elastic IP is needed.
- Security group: `wedsite`.
- Storage: **30 GiB gp3**, encrypted. The default 8 GiB is too small for
  images, swap and backups.
- **Advanced details:**
  - IAM instance profile: `wedsite-ssm` (if using SSM).
  - Termination protection: **enable**.
  - Metadata accessible: **enabled** (the SSM agent needs it).
  - Metadata version: **V2 only**.
  - Metadata response hop limit: **1**. Only the server itself can then
    read instance metadata, not the Docker containers, so a compromised
    container can't pick up the server's AWS credentials.
  - Allow tags in metadata: **disabled**.
  - Credit specification: **Standard**. The CPU is capped when its burst
    credits run out instead of billing for extra use; the site needs far
    less than the cap.
  - EBS-optimized: leave the default. Domain join directory: none.
  - **User data:** paste `deploy/cloud-init.yml`, the same file Hetzner
    uses, after setting `REPO` in it to your GitHub repo.

The setup script picks up the key AWS installed for the `ubuntu` user and
gives it to `wedsite` as well. `ubuntu` stays as AWS's default admin
account, also key-only.

**5. Optional: snapshots.** Go to **EC2 → Lifecycle Manager → Create
lifecycle policy**: EBS snapshot policy, target **volumes** tagged
`Name=wedsite`, default IAM role, daily, keep 7. These are whole-disk
copies that stay in AWS, separate from the server. Any tag works (e.g.
`Stage=prod`), as long as it's on the **volume** itself, not only the
instance. The day after launch, check **EC2 → Snapshots** for the first one.

### Both hosts: configure and deploy

On first boot (about 3 minutes), the cloud config runs
`deploy/server-setup.sh`, which:
- installs Docker, swap, automatic security updates and the host firewall;
- creates the admin user `wedsite` with your key;
- turns off root and password logins;
- clones `/opt/wedsite` and creates `.env`.

Check it finished, after logging in (below):

```bash
cloud-init status --wait              # "status: done"
sudo tail -n 30 /var/log/wedsite-setup.log
```

To set up an existing server instead, run the script as root with
`REPO_URL` set (see its header).

If the GitHub repo is **private**, the cloud config can't download the
script (raw.githubusercontent.com needs a login for private repos), and the
server can't clone without credentials. Add a read-only **deploy key**
(repo **Settings → Deploy keys**) for an SSH key made on the server, copy
the script over by hand, and run it with
`REPO_URL=git@github.com:<github-user>/<repo>.git`. Make the GHCR packages
private too, and use the `docker login` step from
[One-time GitHub setup](#one-time-github-setup).

**Log in:**

```bash
ssh wedsite@<public-ip>                                   # SSH (Hetzner or AWS)
ssh wedsite@wedsite                                       # Tailscale
aws ssm start-session --target <instance-id> --region us-west-2   # AWS SSM
sudo -iu wedsite                                          # ...then, after SSM
```

With SSM you can also connect from the browser: **EC2 → Instances →** your
instance **→ Connect → Session Manager**. If it says the instance isn't
available, wait a few minutes, then check the IAM role is attached. When
you're done, `exit` (or **Terminate** the *session*, not the instance).

**Configure and deploy:**

```bash
nano /opt/wedsite/.env           # every runtime value; IMAGE_REPO=ghcr.io/<github-user>/<repo>
/opt/wedsite/deploy/deploy.sh
/opt/wedsite/deploy/deploy.sh status
```

`.env` needs:
- **Secrets:** `CLOUDFLARE_TUNNEL_TOKEN`, `POSTGRES_PASSWORD`,
  `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `ADMIN_PASSWORD`.
- **Site and email:** `PUBLIC_SITE_URL` (`https://<your domain>`),
  `RESEND_FROM_ADDRESS`, `ADMIN_EMAIL`, `IMAGE_REPO`.
- **Wedding values** (venue local time, no `Z`): `WEDDING_DATE`,
  `RSVP_DEADLINE`, `RSVP_OPENS_AT`, plus the venue, names and reminder
  settings. See the comments in `.env.example`.

Setting up the Resend account (domain, API key, webhook) is in the
[root README](../README.md#email-with-resend).

Make sure the latest CI run on `main` has finished first, so its images
exist. If `deploy.sh` says it "couldn't pull", CI hasn't finished or the
GHCR packages are private and the server isn't logged in.

**Tunnel:** in Cloudflare Zero Trust (**Networks → Tunnels**), point the
tunnel's public hostname at **`http://traefik:80`**. An existing tunnel
token works unchanged: the tunnel doesn't care which machine runs it, as
long as only one server does. Its connector should show as healthy.

**After the first deploy:**
- Open the site, `/api/v1/health/ready` and `/api/v1/health/worker`, and
  log in to the admin.
- On the admin **Wedding** tab, check both first names are set. Email
  headers and sign-offs use them.
- Add yourselves as a household before uploading the guest list, so you
  get every email too.
- Set up the monitors below.

## Day to day

On the server, as `wedsite`, from `/opt/wedsite` (the same on both hosts):

```bash
deploy/deploy.sh               # deploy the newest commit on main
deploy/deploy.sh <commit>      # deploy a specific commit (full or short SHA)
deploy/deploy.sh status        # what's running, health, recent deploys
deploy/deploy.sh rollback      # back to the previous successful deploy
```

Each CI run on `main` prints the exact deploy command in its run summary.

`rollback` redeploys the most recent successful deploy that isn't the
current one. Running it twice in a row goes back to where you started. To
step back further, deploy a specific commit (`status` lists recent ones).

Deploys first take a database dump (`.deploy/backups/`, newest 10 kept),
because migrations run on start and switching images back doesn't undo them.
These dumps stay **on the server**: they protect against a bad deploy, not a
lost server. For that, see the provider backups under
[Choose a host](#choose-a-host).

### Monitoring

Point an uptime monitor (e.g. UptimeRobot) at both of these:

- `https://<your domain>/api/v1/health/ready`: the site and its database.
- `https://<your domain>/api/v1/health/worker`: the background worker that
  sends every email. If it's down, emails silently stop going out while the
  site still looks fine.

Both return `200` when healthy and `503` when not. In Resend's webhook
settings, subscribe to `email.delivered`, `email.opened`, `email.clicked`,
`email.bounced`, `email.complained`, `email.failed` and `email.suppressed`,
so emails Resend can't deliver show up as failed on the dashboard (see
[Email with Resend](../README.md#email-with-resend)).

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
`deploy/local-server-sim.sh` sets up a folder (`~/wedsite-sim`) the way
`/opt/wedsite` is set up on the server: a sparse checkout plus `.env`. You
run the real `deploy.sh` in it. It doesn't repeat the server-level setup
(firewall, users, swap). The differences: the tunnel container is replaced
by one that does nothing, email and tunnel credentials are dummies, and the
site is at `http://localhost`. It uses the same container names as the local dev
stack, so stop that first.

```bash
# The real pipeline: git from GitHub, images from GHCR (run CI first)
deploy/local-server-sim.sh setup ghcr
~/wedsite-sim/deploy/deploy.sh            # then status / rollback / <commit>

# Before pushing anything: committed local main, images built here
deploy/local-server-sim.sh setup local    # builds main's images, pushes them to a
                                          # throwaway registry on localhost:5000
~/wedsite-sim/deploy/deploy.sh
# ...commit more, then:
deploy/local-server-sim.sh publish && ~/wedsite-sim/deploy/deploy.sh

deploy/local-server-sim.sh teardown       # removes everything it created,
                                          # including that registry
```

Worth trying: a deploy, `status`, a second deploy, `rollback`, and a
deploy of a commit CI hasn't built (it should stop and change nothing).

## Local builds

From a full checkout, the same stack builds and runs locally without the
tunnel. List the services, so `cloudflared` never starts and joins the
production tunnel:

```bash
docker compose up -d --build db redis service-wed worker traefik ui-wed socket-proxy
```

`IMAGE_REPO` can be anything locally. See the
[root README](../README.md#option-2-the-production-stack-locally).
