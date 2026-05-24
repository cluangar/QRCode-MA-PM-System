# MA/PM AR Inspector — Project Summary

## Overview

A Progressive Web App (PWA) for factory maintenance teams. Workers scan a QR code label on
any machine with their phone camera and instantly see live maintenance data in an AR-style
overlay — work orders, PM schedules, spare parts, and runtime hours. Admins manage all data
through a separate protected dashboard.

---

## System Architecture

```
Phone Camera  →  jsQR (QR scan)  →  Machine ID
                                         ↓
                              Express API (:3001)
                                         ↓
                              SQLite DB (WAL mode)
                                         ↓
              ┌──────────────────────────────────────┐
              │  AR Overlay (React PWA)              │
              │   /           — scan + AR view       │
              │   /?admin     — admin dashboard      │
              │   /?machines  — machine CRUD         │
              │   /?print     — QR label printer     │
              │   /?reports   — CSV export           │
              │   /?mqtt      — MQTT sensor mapping  │
              └──────────────────────────────────────┘
                                         ↓
              ┌──────────────────────────────────────┐
              │  MQTT (optional)                     │
              │   server-side client → SQLite        │
              │   maps topic → machine field         │
              └──────────────────────────────────────┘

Dev:   Vite  :5173 (HTTPS) + Express :3001 (HTTP)
Prod:  Express :3001 (HTTPS — self-signed cert via openssl)
```

---

## Files

| File | Purpose |
|---|---|
| `server.js` | Express API, SQLite schema, MQTT manager, HTTPS cert generation |
| `config.js` | Single source of truth for all runtime settings |
| `.env` | Local overrides (gitignored) — loaded by config.js |
| `.env.example` | Template for .env |
| `vite.config.js` | Vite dev server + HTTPS + /api proxy to :3001 |
| `package.json` | Dependencies and npm scripts |
| `sync-docker.bat` | Windows: builds frontend + syncs files into docker/ |
| `docker/Dockerfile` | Single-stage image — installs prod deps, copies pre-built files |
| `docker/docker-compose.yml` | Ports, volume mount, env wiring |
| `docker/.env.example` | Docker deployment config template |
| `docker/README.md` | Deploy and re-deploy instructions |
| `src/App.jsx` | Route guards + AR screen orchestration |
| `src/main.jsx` | React entry point |
| `src/api/backend.js` | Fetch wrappers for all API calls |
| `src/hooks/useCamera.js` | getUserMedia + play() |
| `src/hooks/useQRScanner.js` | jsQR canvas frame scanning loop |
| `src/hooks/useMachineData.js` | Fetch + 30 s auto-refresh + demo fallback |
| `src/screens/LandingScreen.jsx` | Start camera / load demo — hides demo after DB reset |
| `src/screens/LoadingScreen.jsx` | Spinner while scanning or fetching |
| `src/screens/AdminScreen.jsx` | Dashboard — stats, alerts, DB maintenance, MQTT nav card |
| `src/screens/MachinesScreen.jsx` | Machine CRUD — search bar, select mode, bulk delete |
| `src/screens/PrintQRScreen.jsx` | QR label printer — all machines or selected subset |
| `src/screens/ReportsScreen.jsx` | CSV export — machines, WOs, PM, parts |
| `src/screens/MQTTScreen.jsx` | MQTT broker config + sensor-to-field topic mapping |
| `src/components/AdminGate.jsx` | Login wrapper for all admin pages |
| `src/components/AROverlay.jsx` | Tap zones over machine silhouette |
| `src/components/panels/` | StatusPanel, WorkOrderPanel, PMPanel, PartsPanel, RuntimePanel |
| `src/components/ui/` | DetailPanel, SpecCard, ActionButton, Toast |
| `src/data/demoData.js` | Fallback data when API is offline |

---

## Authentication

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USER` | `docadmin` | Admin username |
| `ADMIN_PASS` | `admin1234` | Admin password |

1. Browser → `GET /?admin` (or any admin page) → `AdminGate` renders login form
2. `POST /api/auth` with credentials → server validates → returns `{ ok: true }`
3. Session token stored in `sessionStorage` — persists until tab closes
4. Logout button on Admin Dashboard clears the token

Credentials validated server-side — not embedded in the JS bundle.

---

## Configuration (`config.js`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `ADMIN_USER` | `docadmin` | Admin username |
| `ADMIN_PASS` | `admin1234` | Admin password |
| `DB_PATH` | `./mapm.db` | SQLite file path (absolute paths supported) |
| `PM_TRIGGER_HOURS` | `500` | Default PM threshold for new machines |
| `DEMO_SEED` | `true` | Seed demo machines on first run |
| `SERVER_IP` | `` | Host LAN IP added to self-signed cert SAN (Docker) |

`config.js` reads `.env` without any extra dependency, then falls back to hardcoded defaults.
Copy `.env.example` → `.env` to override values locally or in production.

---

## AR App

### Flow
```
Landing screen
  ├─ Start Camera → QR scan mode → scan QR code → AR overlay
  ├─ Load Demo   → AR overlay (MCH-001, pre-loaded data)
  └─ URL param   → /?id=MCH-001 or /?machine=MCH-001 → AR overlay
```

### Tap zones (machine silhouette overlay)
- **STATUS** — machine info, status badge, alert button
- **WO** — active work order, update status/log, link to parts
- **PM** — PM schedule, task checklist, log PM completed
- **PARTS** — spare parts inventory with stock levels
- **RUNTIME** — runtime hours (today / month / total / PM trigger)

---

## Admin Dashboard (`/?admin`)

- **Stats bar** — Machines, Running, Fault, Idle, Open WOs, Overdue PM, Low Stock
- **Nav cards** — quick links to Machines / Print QR / Reports / MQTT with alert badges
- **Alerts panel** — fault machines, overdue PMs, high-priority WOs, low-stock parts
- **Machine list** — all machines with status dot, WO/PM/stock tags, runtime hours
- **Database Maintenance** — VACUUM, purge completed WOs, backup, restore, Reset Database

---

## Machine Management (`/?machines`)

Full CRUD. Tap a card to open the edit drawer with three tabs:
- **Info** — ID, name, location, model, serial, status, runtime hours, PM trigger threshold
- **PM Schedule** — frequency, last/next dates, status, task list
- **Parts** — spare parts with inline qty editing, add/delete

**Search bar** — filters live by name, ID, location, model, or status.

**Select mode** — tap **Select** to toggle. Bottom action bar shows:
- **Print QR →** — navigates to `/?print&ids=...` with selected IDs
- **Delete →** — confirms then deletes selected machines + all related data

---

## MQTT Mapping (`/?mqtt`)

Server-side MQTT client maps incoming sensor topics directly to machine fields in SQLite.

### Broker config
Protocol, host, port, username, password, client ID. Saved to `settings` table. Auto-connects on server start if config exists.

### Topic mapping
| Field | Topic | JSON key | Value map |
|---|---|---|---|
| `status` | `plant/line1/status` | `state` | `0=Fault,1=Running` |
| `runtime_hours` | `plant/line1/hours` | *(raw)* | *(none)* |

Allowed fields: `status`, `runtime_hours`, `today_hours`, `month_hours`, `pm_trigger_hours`.
SQL injection prevented by allowlist — `m.field` is never interpolated without validation.

---

## Workflow

```
1. Admin   → /?machines — create machines, add PM schedule + parts

2. Print   → /?print — print QR label for each machine

3. Worker  → Scan label with phone camera
              AR overlay appears with live data

4. Worker  → Tap WO / PM / PARTS / RUNTIME zones for details

5. Worker  → Log work order progress or mark PM completed

6. Admin   → /?reports — export CSV for all data
```

---

## Technical Notes

### Critical issues solved
| Issue | Solution |
|---|---|
| Camera blocked on LAN (HTTP) | HTTPS via self-signed cert (openssl) in Docker — `NODE_ENV=production` guards cert generation so Windows dev is unaffected |
| `openssl` not on Windows dev | HTTPS only runs when `NODE_ENV=production`; dev uses Vite's built-in SSL |
| Express 5 rejects `app.get('*', ...)` | Changed to `app.get('/{*path}', ...)` — path-to-regexp v8 requires named parameters |
| `better-sqlite3` build fails on Alpine | Added `python3 make g++` to Dockerfile `apk add` before `npm install` |
| Demo data re-seeds after DB reset | `demo_seeded` flag in `settings` table checked at startup; reset endpoint also writes flag |
| `npm install` peer dep conflict | `--legacy-peer-deps` flag in Dockerfile and local installs |

### Server routes
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth` | Validate admin credentials |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/machines` | List all machines |
| `GET` | `/api/machine/:id` | Full machine data (WO + PM + parts + runtime) |
| `POST` | `/api/machine` | Create machine |
| `PATCH` | `/api/machine/:id` | Update machine fields |
| `DELETE` | `/api/machine/:id` | Delete machine + all related data |
| `GET` | `/api/pm/machine/:id` | Get PM schedule |
| `PUT` | `/api/pm/machine/:id` | Upsert PM schedule |
| `PATCH` | `/api/pm/:id` | Update PM fields |
| `POST` | `/api/workorder` | Create work order |
| `PATCH` | `/api/workorder/:id` | Update WO status/log |
| `GET` | `/api/parts/:machineId` | List parts |
| `POST` | `/api/parts` | Add part |
| `PATCH` | `/api/parts/:id` | Update part |
| `DELETE` | `/api/parts/:id` | Delete part |
| `GET` | `/api/report` | All data joined for CSV export |
| `GET` | `/api/db/stats` | DB file size + row counts |
| `GET` | `/api/db/backup` | Download raw SQLite file |
| `POST` | `/api/db/restore` | Upload SQLite file to replace DB |
| `POST` | `/api/db/reset` | Delete all rows; sets `demo_seeded` flag |
| `POST` | `/api/db/vacuum` | VACUUM + WAL checkpoint |
| `POST` | `/api/db/purge` | Delete completed work orders |
| `GET` | `/api/mqtt/status` | MQTT connection state |
| `GET` | `/api/mqtt/config` | Get broker config |
| `POST` | `/api/mqtt/config` | Save broker config + connect |
| `POST` | `/api/mqtt/disconnect` | Disconnect MQTT client |
| `GET` | `/api/mqtt/mappings` | List topic mappings |
| `POST` | `/api/mqtt/mapping` | Add topic mapping |
| `DELETE` | `/api/mqtt/mapping/:id` | Delete topic mapping |

### Database schema
```sql
machines      (id, name, location, model, serial, status,
               runtime_hours, pm_trigger_hours, today_hours, month_hours)

workorders    (id, machine_id, type, priority, status,
               assigned_to, due_date, description, work_log, created_at)

pm_schedules  (id, machine_id, frequency, last_pm_date,
               next_due_date, status, tasks)

spare_parts   (id, machine_id, name, qty_in_stock, reorder_level, unit)

mqtt_mappings (id, topic, machine_id, field, json_key, value_map)

settings      (key, value)   -- demo_seeded, mqtt_config
```

### Tech stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| PWA | vite-plugin-pwa |
| HTTPS (dev) | @vitejs/plugin-basic-ssl (Vite) |
| HTTPS (prod) | Node.js `https` + openssl self-signed cert |
| Camera | getUserMedia API |
| QR scanning | jsQR (canvas frame scanning) |
| QR generation | qrcode |
| Backend | Express 5 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| MQTT | mqtt (server-side client) |
| Dev runner | concurrently |

---

## Demo Machines

| ID | Machine | Location | Status |
|---|---|---|---|
| MCH-001 | CNC Lathe #3 | Line B Bay 4 | Fault |
| MCH-002 | Hydraulic Press #1 | Line A Bay 1 | Running |
| MCH-003 | Conveyor Belt #7 | Line C | Idle |

Seeded on first run only (`demo_seeded` flag). Hidden from landing screen after Reset Database.

---

*Updated: 2026-05-24 | MA/PM AR Inspector*
