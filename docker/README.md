# MA/PM AR Inspector — Docker Deployment

## Quick start (fresh deploy)

```bat
REM 1. On your Windows dev machine, from project root — build + sync into docker\:
sync-docker.bat
```

```sh
# 2. Copy the docker/ folder to the target Linux host:
scp -r docker/ user@host:/opt/mapm/

# 3. On the host:
cd /opt/mapm
cp .env.example .env && nano .env     # set credentials + port (optional)
docker compose up --build -d
```

App is live at `http://host:3001` (or the PORT you set).

---

## Re-deploy after code changes

```bat
REM Dev machine:
sync-docker.bat
```

```sh
# Then:
scp -r docker/ user@host:/opt/mapm/
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
| `sync-docker.bat` | *(project root)* Build frontend + sync app files into this folder |
| `Dockerfile` | Simple image build — installs prod deps, copies pre-built files |
| `docker-compose.yml` | Ports, volume mount, env wiring |
| `.env.example` | Config template |
| `server.js` / `config.js` | *(synced by sync.sh)* |
| `dist/` | *(synced by sync.sh)* Built React frontend |
| `package*.json` | *(synced by sync.sh)* |

---

## Data persistence

Database lives in `./data/mapm.db` (next to `docker-compose.yml`) on the host, mounted into `/app/data/` inside the container. It survives container rebuilds and restarts.

To back up: `cp -r ./data/ ~/mapm-backup/`
