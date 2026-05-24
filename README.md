# QRCode MA/PM System

A Progressive Web App for factory maintenance teams. Workers scan a QR code label on any machine with their phone camera and instantly see live maintenance data — work orders, PM schedules, spare parts, and runtime hours — in an AR-style overlay. Admins manage everything through a protected dashboard.

---

## Features

- **AR Inspector** — scan a machine QR code → live overlay with 5 data zones
- **Admin Dashboard** — stats bar, alerts panel, machine list with color-coded status
- **Machine Management** — full CRUD with Info / PM Schedule / Parts tabs
- **Print QR Labels** — print the web app URL QR + individual machine labels; select specific machines from the machine list
- **Reports & CSV Export** — machines, work orders, PM schedules, parts; UTF-8 BOM for Excel
- **Server-side auth** — credentials stored in `.env`, validated via API (not in JS bundle)
- **PWA** — installable on Android/iOS, works offline with cached data
- **Docker ready** — single `docker compose up --build -d` deploys the full stack

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| PWA | vite-plugin-pwa |
| HTTPS (dev) | @vitejs/plugin-basic-ssl |
| QR scanning | jsQR (canvas frame scanning) |
| QR generation | qrcode |
| Backend | Express 5 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Dev runner | concurrently |

---

## Quick Start

```bash
npm install
npm start
```

- **AR app** → `https://<your-ip>:5173` (HTTPS required for camera on LAN)
- **API server** → `http://localhost:3001`

> Stop with **Ctrl+C** to shut down both processes cleanly.

### Default admin login

| Field | Value |
|---|---|
| Username | `docadmin` |
| Password | `admin1234` |

Override in `.env` — see `.env.example`.

---

## Pages

| URL | Page | Auth |
|---|---|---|
| `/` | AR App — scan QR & inspect machine | No |
| `/?admin` | Admin Dashboard | Yes |
| `/?machines` | Machine Management | Yes |
| `/?print` | Print QR Labels | Yes |
| `/?reports` | Reports & CSV Export | Yes |

---

## Configuration

Copy `.env.example` → `.env` and edit before starting:

```env
PORT=3001
ADMIN_USER=docadmin
ADMIN_PASS=admin1234
DB_PATH=./mapm.db
PM_TRIGGER_HOURS=500
DEMO_SEED=true
```

---

## Docker Deploy

Run on a Linux machine:

```sh
# 1. Pack the app (from project root)
sh docker/pack.sh

# 2. Copy docker/ folder to target host
scp -r docker/ user@host:/opt/mapm/

# 3. Start on target host
cd /opt/mapm && docker compose up --build -d
```

See [docker/README.md](docker/README.md) for the full deploy and re-deploy guide.

---

## Demo Machines

| ID | Machine | Location | Status |
|---|---|---|---|
| MCH-001 | CNC Lathe #3 | Line B Bay 4 | Fault |
| MCH-002 | Hydraulic Press #1 | Line A Bay 1 | Running |
| MCH-003 | Conveyor Belt #7 | Line C | Idle |

Demo data is seeded automatically on first run (`DEMO_SEED=true`).
