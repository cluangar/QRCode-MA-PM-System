# MA/PM AR Inspector — Docker Deployment

## Quick start (fresh deploy)

```sh
# 1. On the Linux build machine, from project root:
sh docker/pack.sh                          # builds frontend + packs app.tar.gz

# 2. Copy docker/ folder to target host:
scp -r docker/ user@host:/opt/mapm/

# 3. On the target host:
cd /opt/mapm
cp .env.example .env && nano .env          # set credentials + port (optional)
docker compose up --build -d
```

App is live at `http://host:3001` (or the PORT you set).

---

## Re-deploy after code changes

```sh
# Build machine:
sh docker/pack.sh
scp docker/app.tar.gz user@host:/opt/mapm/

# Target host:
cd /opt/mapm && docker compose up --build -d
```

---

## Common commands (on target host)

```sh
docker compose logs -f          # live logs
docker compose down             # stop
docker compose up --build -d    # start / rebuild
```

---

## Configuration — `.env`

Copy `.env.example` → `.env` and edit before first start.  
If `.env` is absent, defaults from `config.js` apply.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Host port |
| `ADMIN_USER` | `docadmin` | Admin login username |
| `ADMIN_PASS` | `admin1234` | Admin login password |
| `PM_TRIGGER_HOURS` | `500` | Default PM threshold for new machines |
| `DEMO_SEED` | `true` | Seed MCH-001/002/003 on first run |

`DB_PATH` is set to `/app/data/mapm.db` by `docker-compose.yml`; do not override in `.env`.

---

## Folder contents

| File | Purpose |
|---|---|
| `pack.sh` | Build + pack script (run on Linux build machine) |
| `Dockerfile` | Container image — just extracts app.tar.gz, no build step |
| `docker-compose.yml` | Ports, volume mount, env wiring |
| `.env.example` | Config template |
| `Dockerfile.dockerignore` | BuildKit ignore rules |
| `app.tar.gz` | *(generated)* Packed app — not in repo |

---

## Data persistence

Database lives in `./data/mapm.db` (next to `docker-compose.yml`) on the host, mounted into `/app/data/` inside the container. It survives container rebuilds and restarts.

To back up: `cp -r ./data/ ~/mapm-backup/`
