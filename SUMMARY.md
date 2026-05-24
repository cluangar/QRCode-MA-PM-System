# MA/PM AR Inspector — Project Summary

## Overview

A Progressive Web App (PWA) for factory maintenance teams. Workers scan a QR code label on any machine with their phone camera and instantly see live maintenance data in an AR-style overlay — work orders, PM schedules, spare parts, and runtime hours. Admins manage all data through a separate protected dashboard.

---

## How to Run

### Local development

```bash
npm start
```

Starts both servers simultaneously:
- **Vite dev server** → `https://<your-ip>:5173` (HTTPS required for camera on LAN)
- **Express API server** → `http://localhost:3001`

> Always stop with **Ctrl+C** to cleanly shut down both processes. If port 3001 stays occupied, kill the stale Node process manually before restarting.

### Docker (production)

```sh
# On Linux build machine, from project root:
sh docker/pack.sh

# Copy docker/ to target host and start:
scp -r docker/ user@host:/opt/mapm/
ssh user@host "cd /opt/mapm && docker compose up --build -d"
```

See [docker/README.md](docker/README.md) for full deploy and re-deploy instructions.

---

## Navigation

| URL | Page | Login required |
|-----|------|----------------|
| `/` | AR App (scan & inspect) | No |
| `/?admin` | Admin Dashboard | Yes |
| `/?machines` | Machine Management | Yes |
| `/?print` | Print QR Labels | Yes |
| `/?reports` | Reports & CSV Export | Yes |

### Admin Login
- **Username / Password:** set in `.env` (`ADMIN_USER` / `ADMIN_PASS`); defaults are `docadmin` / `admin1234`
- Credentials are validated server-side via `POST /api/auth` — not embedded in the JS bundle
- Session persists until the browser tab is closed. Logout button on the Admin Dashboard.

---

## AR App Flow

```
Landing screen
  ├─ Start Camera → Loading (QR scan mode) → scan QR → AR overlay
  ├─ Load Demo   → Loading → AR overlay (MCH-001)
  └─ URL param   → /?id=MCH-001 or /?machine=MCH-001 → AR overlay
```

The AR overlay shows 5 tap zones on the machine silhouette:
- **STATUS** — machine info, status, alert button
- **WO** — active work order, update status/log, link to parts
- **PM** — PM schedule, task checklist, log PM completed
- **PARTS** — spare parts inventory with stock levels
- **RUNTIME** — runtime hours (today / month / total / PM trigger)

---

## Admin Dashboard (`/?admin`)

- **Stats bar** — Machines, Running, Fault, Idle, Open WOs, Overdue PM, Low Stock (color-coded)
- **Nav cards** — quick links to Machines / Print QR / Reports with alert badges
- **Alerts panel** — red/amber list of fault machines, overdue PMs, high-priority WOs, low-stock parts
- **Machine list** — all machines with status dot, WO/PM/stock tags, runtime hours
- **Database Maintenance** — VACUUM, purge completed WOs, download backup, restore backup, and **Reset Database** (clears all data; no re-seed; demo mode hidden after reset)

---

## Machine Management (`/?machines`)

Full CRUD for machines. Tap a card to open the edit drawer. Each machine has three tabs:
- **Info** — ID, name, location, model, serial, status, runtime hours, PM trigger threshold
- **PM Schedule** — frequency, last/next dates, status, task list
- **Parts** — spare parts with inline qty editing, add/delete

**Search bar** — always visible below the header; filters the machine list live by name, ID, location, model, or status. Shows "No machines match…" when the filter returns nothing.

**Select mode** — tap **Select** in the header to toggle selection mode. Cards show checkboxes; tapping toggles each machine. A fixed bottom action bar shows the selected count and two buttons:
- **Print QR →** — navigates to `/?print&ids=MCH-001,MCH-003` with the selected IDs
- **Delete →** — confirms with a dialog, deletes all selected machines and their related data (WOs, PM, parts) via sequential API calls, then exits select mode with a toast

---

## Print QR Labels (`/?print`)

Two sections on the page:

1. **Web App URL** — one QR card encoding `window.location.origin` (e.g. `http://192.168.1.10:3001`). Post near the entrance so workers can scan to open the app on their phone.
2. **Machine Labels** — one QR card per machine, fetched live from `/api/machines`. Each card encodes the machine ID; the AR app scans it and loads that machine's data.

Click **Print Labels** to send both sections to the printer.

### Selective printing from Machine Management

On the Machine Management page (`/?machines`), tap **Select** in the header to enter selection mode. Tap machine cards to toggle a green checkbox. The bottom action bar **Print QR →** button navigates to `/?print&ids=MCH-001,MCH-003`.

When `ids` is present in the URL, `PrintQRScreen` filters the machine list to only those IDs and shows a "N machines selected" message instead of the full instructions. No `ids` param = all machines shown.

---

## Reports & Export (`/?reports`)

Four tabs, each with **Export CSV** and **Print** buttons:

| Tab | Contents |
|-----|----------|
| Machines | All machines with runtime and status |
| Work Orders | All WOs with priority, assignee, due date |
| PM Schedule | All PM records with tasks |
| Parts | Full inventory with low-stock flag |

CSV files are UTF-8 with BOM (opens correctly in Excel).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| PWA | vite-plugin-pwa |
| HTTPS (dev) | @vitejs/plugin-basic-ssl |
| Camera | getUserMedia API |
| QR scanning | jsQR (canvas frame scanning) |
| QR generation | qrcode |
| Backend | Express 5 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Dev runner | concurrently |

---

## Configuration (`config.js` / `.env`)

`config.js` is the single source of truth for all runtime settings. It reads `.env` from the project root (if present) without any extra dependency, then falls back to hardcoded defaults.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `ADMIN_USER` | `docadmin` | Admin username |
| `ADMIN_PASS` | `admin1234` | Admin password |
| `DB_PATH` | `./mapm.db` | SQLite file path (absolute paths supported) |
| `PM_TRIGGER_HOURS` | `500` | Default PM threshold for new machines |
| `DEMO_SEED` | `true` | Seed demo machines on first run |

Copy `.env.example` → `.env` to override any value locally or in production.

---

## File Structure

```
ar-mapm/
├── server.js              # Express API server
├── config.js              # Central settings (port, credentials, DB path, PM threshold)
├── .env                   # Local overrides (gitignored); loaded by config.js
├── .env.example           # Template for .env
├── mapm.db                # SQLite database (auto-created)
├── vite.config.js         # Vite + HTTPS + /api proxy
├── package.json
├── docker/                # Self-contained Docker deployment folder
│   ├── pack.sh            # Build + pack script (run on Linux build machine)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example       # Deployment config template
│   ├── Dockerfile.dockerignore
│   ├── app.tar.gz         # (generated by pack.sh — not in repo)
│   └── README.md          # Deploy + re-deploy cheat sheet
└── src/
    ├── App.jsx            # Routes + AR screen orchestration
    ├── main.jsx
    ├── api/
    │   └── backend.js     # fetch wrappers for all API calls
    ├── hooks/
    │   ├── useCamera.js   # getUserMedia + play()
    │   ├── useQRScanner.js # jsQR frame scanning loop
    │   └── useMachineData.js # fetch + 30s auto-refresh + demo fallback
    ├── screens/
    │   ├── LandingScreen.jsx
    │   ├── LoadingScreen.jsx
    │   ├── AdminScreen.jsx   # Dashboard with stats + alerts
    │   ├── MachinesScreen.jsx
    │   ├── PrintQRScreen.jsx
    │   └── ReportsScreen.jsx
    ├── components/
    │   ├── AdminGate.jsx     # Login wrapper for all admin pages
    │   ├── AROverlay.jsx     # Tap zones over machine silhouette
    │   ├── HUDBar.jsx
    │   ├── ZoneButton.jsx
    │   ├── panels/
    │   │   ├── StatusPanel.jsx
    │   │   ├── WorkOrderPanel.jsx
    │   │   ├── PMPanel.jsx
    │   │   ├── PartsPanel.jsx
    │   │   └── RuntimePanel.jsx
    │   └── ui/
    │       ├── DetailPanel.jsx
    │       ├── SpecCard.jsx
    │       ├── ActionButton.jsx
    │       └── Toast.jsx
    └── data/
        └── demoData.js       # Fallback data when API is offline
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth` | Validate admin credentials (server-side) |
| GET | `/api/health` | Server health check |
| GET | `/api/machines` | List all machines |
| GET | `/api/machine/:id` | Full machine data (WO + PM + parts + runtime) |
| POST | `/api/machine` | Create machine |
| PATCH | `/api/machine/:id` | Update machine fields |
| DELETE | `/api/machine/:id` | Delete machine + all related data |
| GET | `/api/pm/machine/:id` | Get PM schedule for machine |
| PUT | `/api/pm/machine/:id` | Upsert PM schedule |
| PATCH | `/api/pm/:id` | Update PM fields |
| POST | `/api/workorder` | Create work order |
| PATCH | `/api/workorder/:id` | Update WO status/log |
| GET | `/api/parts/:machineId` | List parts for machine |
| POST | `/api/parts` | Add part |
| PATCH | `/api/parts/:id` | Update part (e.g. qty) |
| DELETE | `/api/parts/:id` | Delete part |
| GET | `/api/report` | All data joined for export |
| GET | `/api/db/stats` | DB file sizes + row counts per table |
| GET | `/api/db/backup` | Download raw SQLite file |
| POST | `/api/db/restore` | Upload SQLite file to replace DB |
| POST | `/api/db/reset` | Delete all rows (no re-seed); sets `demo_seeded` flag |
| POST | `/api/db/vacuum` | VACUUM + WAL checkpoint |
| POST | `/api/db/purge` | Delete completed work orders (optional age filter) |

---

## Database Schema

```sql
machines       (id, name, location, model, serial, status,
                runtime_hours, pm_trigger_hours, today_hours, month_hours)

workorders     (id, machine_id, type, priority, status,
                assigned_to, due_date, description, work_log, created_at)

pm_schedules   (id, machine_id, frequency, last_pm_date,
                next_due_date, status, tasks)

spare_parts    (id, machine_id, name, qty_in_stock, reorder_level, unit)

settings       (key, value)   -- internal flags, e.g. demo_seeded
```

Demo data (MCH-001, MCH-002, MCH-003) is seeded on **first run only**. A `demo_seeded` flag in the `settings` table prevents re-seeding on subsequent restarts. After a Reset Database (`POST /api/db/reset`), the flag is preserved so demo data is never restored and demo mode is hidden on the landing screen.

---

## Demo Machines

| ID | Machine | Location | Status |
|----|---------|----------|--------|
| MCH-001 | CNC Lathe #3 | Line B Bay 4 | Fault |
| MCH-002 | Hydraulic Press #1 | Line A Bay 1 | Running |
| MCH-003 | Conveyor Belt #7 | Line C | Idle |

Seeded on first run only. The **Load Demo Machine** section on the landing screen is visible only when machines exist in the database — it is hidden after a Reset Database.
