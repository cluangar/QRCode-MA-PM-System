import https from 'https'
import os from 'os'
import { execSync } from 'child_process'
import express from 'express'
import Database from 'better-sqlite3'
import mqtt from 'mqtt'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { statSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import config from './config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH   = resolve(config.dbPath)

mkdirSync(dirname(DB_PATH), { recursive: true })
let db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS machines (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    location          TEXT,
    model             TEXT,
    serial            TEXT,
    status            TEXT DEFAULT 'Running',
    runtime_hours     REAL DEFAULT 0,
    pm_trigger_hours  REAL DEFAULT 500,
    today_hours       REAL DEFAULT 0,
    month_hours       REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS workorders (
    id           TEXT PRIMARY KEY,
    machine_id   TEXT NOT NULL,
    type         TEXT DEFAULT 'Corrective',
    priority     TEXT DEFAULT 'Medium',
    status       TEXT DEFAULT 'Open',
    assigned_to  TEXT,
    due_date     TEXT,
    description  TEXT,
    work_log     TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pm_schedules (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id     TEXT NOT NULL,
    frequency      TEXT,
    last_pm_date   TEXT,
    next_due_date  TEXT,
    status         TEXT DEFAULT 'Scheduled',
    tasks          TEXT
  );
  CREATE TABLE IF NOT EXISTS spare_parts (
    id             TEXT PRIMARY KEY,
    machine_id     TEXT NOT NULL,
    name           TEXT NOT NULL,
    qty_in_stock   INTEGER DEFAULT 0,
    reorder_level  INTEGER DEFAULT 5,
    unit           TEXT DEFAULT 'pcs'
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS mqtt_mappings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic      TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    field      TEXT NOT NULL,
    json_key   TEXT,
    value_map  TEXT
  );
`)

// Seed demo data only on true first run (never after a reset)
const alreadySeeded = db.prepare("SELECT value FROM settings WHERE key='demo_seeded'").get()
const empty = db.prepare('SELECT COUNT(*) as n FROM machines').get().n === 0
if (config.demoSeed && empty && !alreadySeeded) {
  db.prepare(`INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    'MCH-001','CNC Lathe #3','Line B Bay 4','Mazak QT-350','SN-20230841','Fault',4821,5000,6.5,142)
  db.prepare(`INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    'MCH-002','Hydraulic Press #1','Line A Bay 1','Schuler MSE 160','SN-20190032','Running',2310,3000,7.2,168)
  db.prepare(`INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    'MCH-003','Conveyor Belt #7','Line C','Hytrol E24','SN-20211107','Idle',980,2000,0,42)

  db.prepare(`INSERT INTO workorders VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
    'WO-2024-0891','MCH-001','Corrective','High','Open','Somchai K.','2024-06-15',
    'Spindle vibration detected at 2800 RPM — bearing noise','')
  db.prepare(`INSERT INTO workorders VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
    'WO-2024-0887','MCH-002','Preventive','Medium','In Progress','Napat W.','2024-06-20',
    'Scheduled 500-hr hydraulic fluid change','Drained old fluid. Waiting for new oil delivery.')

  db.prepare(`INSERT INTO pm_schedules (machine_id,frequency,last_pm_date,next_due_date,status,tasks) VALUES (?,?,?,?,?,?)`).run(
    'MCH-001','Every 500 hrs','2024-04-10','2024-06-15','Overdue',
    'Inspect spindle bearings\nCheck coolant level\nLubricate guide rails\nCalibrate tool offset')
  db.prepare(`INSERT INTO pm_schedules (machine_id,frequency,last_pm_date,next_due_date,status,tasks) VALUES (?,?,?,?,?,?)`).run(
    'MCH-002','Every 500 hrs','2024-05-01','2024-07-01','Scheduled',
    'Change hydraulic fluid\nCheck seals and hoses\nTest pressure relief valve')
  db.prepare(`INSERT INTO pm_schedules (machine_id,frequency,last_pm_date,next_due_date,status,tasks) VALUES (?,?,?,?,?,?)`).run(
    'MCH-003','Monthly','2024-05-15','2024-06-15','Scheduled',
    'Inspect belt tension\nClean drive rollers\nCheck motor mounts')

  const parts = [
    ['PT-001','MCH-001','Spindle Bearing 6205',2,3,'pcs'],
    ['PT-002','MCH-001','Coolant Filter',5,10,'pcs'],
    ['PT-003','MCH-001','Guide Rail Lubricant',1,2,'litre'],
    ['PT-004','MCH-002','Hydraulic Fluid ISO 46',3,4,'litre'],
    ['PT-005','MCH-002','Hydraulic Seal Kit',1,2,'set'],
    ['PT-006','MCH-003','Drive Belt B-78',4,5,'pcs'],
    ['PT-007','MCH-003','Roller Bearing 6004',2,3,'pcs'],
  ]
  const ins = db.prepare('INSERT INTO spare_parts VALUES (?,?,?,?,?,?)')
  parts.forEach(p => ins.run(...p))
  db.prepare("INSERT OR REPLACE INTO settings VALUES ('demo_seeded', '1')").run()
  console.log('Demo data seeded.')
}

// ── MQTT manager ─────────────────────────────────────────────────────────────
const MQTT_FIELDS = ['status', 'runtime_hours', 'today_hours', 'month_hours', 'pm_trigger_hours']
let mqttClient = null
let mqttState  = { state: 'disconnected', error: '' }

function getMqttCfg() {
  const row = db.prepare("SELECT value FROM settings WHERE key='mqtt_config'").get()
  return row ? JSON.parse(row.value) : null
}

function applyMqttValue(payload, jsonKey, valueMap) {
  let v = payload.toString().trim()
  if (jsonKey) {
    try { v = String(JSON.parse(payload)?.[jsonKey] ?? v) } catch {}
  }
  if (valueMap) {
    const map = Object.fromEntries(
      valueMap.split(',').map(p => { const [k, ...rest] = p.trim().split('='); return [k, rest.join('=')] })
    )
    if (map[v] !== undefined) v = map[v]
  }
  return v
}

function connectMqtt(cfg) {
  if (mqttClient) { mqttClient.end(true); mqttClient = null }
  if (!cfg?.host) return
  mqttState = { state: 'connecting', error: '' }
  const url = `${cfg.protocol || 'mqtt'}://${cfg.host}:${cfg.port || 1883}`
  mqttClient = mqtt.connect(url, {
    username: cfg.username || undefined,
    password: cfg.password || undefined,
    clientId: cfg.clientId || `mapm-${Math.random().toString(36).slice(2, 8)}`,
    connectTimeout: 8000,
    reconnectPeriod: 10000,
  })
  mqttClient.on('connect', () => {
    mqttState = { state: 'connected', error: '' }
    const topics = db.prepare('SELECT DISTINCT topic FROM mqtt_mappings').all().map(r => r.topic)
    if (topics.length) mqttClient.subscribe(topics)
  })
  mqttClient.on('error',   err  => { mqttState = { state: 'error', error: err.message } })
  mqttClient.on('offline', ()   => { mqttState = { state: 'disconnected', error: '' } })
  mqttClient.on('message', (topic, payload) => {
    const maps = db.prepare('SELECT * FROM mqtt_mappings WHERE topic=?').all(topic)
    for (const m of maps) {
      if (!MQTT_FIELDS.includes(m.field)) continue
      const val = applyMqttValue(payload, m.json_key, m.value_map)
      const numFields = ['runtime_hours', 'today_hours', 'month_hours', 'pm_trigger_hours']
      db.prepare(`UPDATE machines SET ${m.field}=? WHERE id=?`)
        .run(numFields.includes(m.field) ? (Number(val) || 0) : val, m.machine_id)
    }
  })
}

// Auto-connect if config saved
const savedMqttCfg = getMqttCfg()
if (savedMqttCfg?.host) connectMqtt(savedMqttCfg)

// ─────────────────────────────────────────────────────────────────────────────

const app = express()
app.use(express.json())

// --- Auth ---
app.post('/api/auth', (req, res) => {
  const { user, pass } = req.body
  if (user === config.adminUser && pass === config.adminPass) {
    res.json({ ok: true })
  } else {
    res.status(401).json({ error: 'Invalid username or password' })
  }
})

// --- Machines ---
app.get('/api/machine/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id)
  if (!m) return res.status(404).json({ error: 'Machine not found' })

  const wo = db.prepare(
    "SELECT * FROM workorders WHERE machine_id = ? AND status != 'Completed' ORDER BY created_at DESC LIMIT 1"
  ).get(req.params.id)

  const pm    = db.prepare('SELECT * FROM pm_schedules WHERE machine_id = ? LIMIT 1').get(req.params.id)
  const parts = db.prepare('SELECT * FROM spare_parts WHERE machine_id = ?').all(req.params.id)

  res.json({
    machine: {
      id: m.id, name: m.name, location: m.location,
      model: m.model, serial: m.serial, status: m.status,
    },
    wo: wo ? {
      id: wo.id, num: wo.id, type: wo.type, priority: wo.priority,
      status: wo.status, tech: wo.assigned_to, due: wo.due_date,
      desc: wo.description, workLog: wo.work_log,
    } : null,
    pm: pm ? {
      id: pm.id, freq: pm.frequency, last: pm.last_pm_date,
      next: pm.next_due_date, status: pm.status,
      tasks: (pm.tasks || '').split('\n').filter(Boolean),
    } : null,
    parts: parts.map(p => ({
      id: p.id, name: p.name, qty: p.qty_in_stock,
      reorder: p.reorder_level, unit: p.unit,
    })),
    runtime: {
      total:   m.runtime_hours   ? `${m.runtime_hours} hrs`   : '—',
      trigger: m.pm_trigger_hours ? `At ${m.pm_trigger_hours} hrs` : '—',
      today:   m.today_hours     ? `${m.today_hours} hrs`     : '—',
      month:   m.month_hours     ? `${m.month_hours} hrs`     : '—',
      trend: [0, 0, 0, 0, 0, 0, 0],
    },
  })
})

app.get('/api/machines', (_req, res) => {
  res.json(db.prepare('SELECT * FROM machines ORDER BY id').all())
})

app.post('/api/machine', (req, res) => {
  const { id, name, location='', model='', serial='', status='Running',
          runtime_hours=0, pm_trigger_hours=config.pmTriggerHours, today_hours=0, month_hours=0 } = req.body
  if (!id || !name) return res.status(400).json({ error: 'id and name required' })
  try {
    db.prepare(`INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, name, location, model, serial, status, runtime_hours, pm_trigger_hours, today_hours, month_hours)
    res.json({ ok: true })
  } catch (e) {
    res.status(409).json({ error: e.message })
  }
})

app.patch('/api/machine/:id', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE machines SET ${fields} WHERE id = ?`).run(...Object.values(req.body), req.params.id)
  res.json({ ok: true })
})

app.delete('/api/machine/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM workorders   WHERE machine_id = ?').run(id)
  db.prepare('DELETE FROM pm_schedules WHERE machine_id = ?').run(id)
  db.prepare('DELETE FROM spare_parts  WHERE machine_id = ?').run(id)
  db.prepare('DELETE FROM machines     WHERE id = ?').run(id)
  res.json({ ok: true })
})

// --- Work Orders ---
app.patch('/api/workorder/:id', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE workorders SET ${fields} WHERE id = ?`).run(...Object.values(req.body), req.params.id)
  res.json({ ok: true })
})

app.post('/api/workorder', (req, res) => {
  const id = `WO-${Date.now()}`
  const { machine_id, type='Corrective', priority='High', description='' } = req.body
  db.prepare(`INSERT INTO workorders (id,machine_id,type,priority,status,description) VALUES (?,?,?,?,?,?)`)
    .run(id, machine_id, type, priority, 'Open', description)
  res.json({ id })
})

// --- PM Schedules ---
app.patch('/api/pm/:id', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE pm_schedules SET ${fields} WHERE id = ?`).run(...Object.values(req.body), req.params.id)
  res.json({ ok: true })
})

app.put('/api/pm/machine/:machineId', (req, res) => {
  const existing = db.prepare('SELECT id FROM pm_schedules WHERE machine_id = ?').get(req.params.machineId)
  const { frequency='', last_pm_date='', next_due_date='', status='Scheduled', tasks='' } = req.body
  if (existing) {
    db.prepare('UPDATE pm_schedules SET frequency=?,last_pm_date=?,next_due_date=?,status=?,tasks=? WHERE id=?')
      .run(frequency, last_pm_date, next_due_date, status, tasks, existing.id)
  } else {
    db.prepare('INSERT INTO pm_schedules (machine_id,frequency,last_pm_date,next_due_date,status,tasks) VALUES (?,?,?,?,?,?)')
      .run(req.params.machineId, frequency, last_pm_date, next_due_date, status, tasks)
  }
  res.json({ ok: true })
})

app.get('/api/pm/machine/:machineId', (req, res) => {
  res.json(db.prepare('SELECT * FROM pm_schedules WHERE machine_id = ?').get(req.params.machineId) || null)
})

// --- Spare Parts ---
app.get('/api/parts/:machineId', (req, res) => {
  res.json(db.prepare('SELECT * FROM spare_parts WHERE machine_id = ? ORDER BY id').all(req.params.machineId))
})

app.post('/api/parts', (req, res) => {
  const { machine_id, name, qty_in_stock=0, reorder_level=5, unit='pcs' } = req.body
  const id = `PT-${Date.now()}`
  db.prepare('INSERT INTO spare_parts VALUES (?,?,?,?,?,?)').run(id, machine_id, name, qty_in_stock, reorder_level, unit)
  res.json({ id })
})

app.patch('/api/parts/:id', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE spare_parts SET ${fields} WHERE id = ?`).run(...Object.values(req.body), req.params.id)
  res.json({ ok: true })
})

app.delete('/api/parts/:id', (req, res) => {
  db.prepare('DELETE FROM spare_parts WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// --- DB Maintenance ---
function dbFileSize(path) {
  try { return statSync(path).size } catch { return 0 }
}

app.get('/api/db/stats', (_req, res) => {
  res.json({
    dbSize:  dbFileSize(DB_PATH),
    walSize: dbFileSize(DB_PATH + '-wal'),
    counts: {
      machines:     db.prepare('SELECT COUNT(*) as n FROM machines').get().n,
      workorders:   db.prepare('SELECT COUNT(*) as n FROM workorders').get().n,
      completed_wo: db.prepare("SELECT COUNT(*) as n FROM workorders WHERE status='Completed'").get().n,
      pm:           db.prepare('SELECT COUNT(*) as n FROM pm_schedules').get().n,
      parts:        db.prepare('SELECT COUNT(*) as n FROM spare_parts').get().n,
    },
  })
})

app.post('/api/db/vacuum', (_req, res) => {
  db.pragma('wal_checkpoint(TRUNCATE)')
  db.exec('VACUUM')
  res.json({ ok: true, dbSize: dbFileSize(DB_PATH), walSize: dbFileSize(DB_PATH + '-wal') })
})

app.post('/api/db/purge', (req, res) => {
  const { target = 'completed_wo', days = 0 } = req.body
  let deleted = 0
  if (target === 'completed_wo') {
    if (days > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - Number(days))
      deleted = db.prepare(
        "DELETE FROM workorders WHERE status='Completed' AND created_at <= ?"
      ).run(cutoff.toISOString()).changes
    } else {
      deleted = db.prepare("DELETE FROM workorders WHERE status='Completed'").run().changes
    }
  }
  res.json({ deleted })
})

app.get('/api/db/backup', (_req, res) => {
  db.pragma('wal_checkpoint(PASSIVE)')
  const filename = `mapm-backup-${new Date().toISOString().split('T')[0]}.db`
  res.download(DB_PATH, filename)
})

app.post('/api/db/reset', (_req, res) => {
  db.exec(`
    DELETE FROM spare_parts;
    DELETE FROM pm_schedules;
    DELETE FROM workorders;
    DELETE FROM machines;
  `)
  db.prepare("INSERT OR REPLACE INTO settings VALUES ('demo_seeded', '1')").run()
  res.json({ ok: true })
})


app.post('/api/db/restore',
  express.raw({ type: 'application/octet-stream', limit: '100mb' }),
  (req, res) => {
    const SQLITE_MAGIC = Buffer.from('SQLite format 3\x00')
    if (!Buffer.isBuffer(req.body) || req.body.length < 16 || !req.body.slice(0, 16).equals(SQLITE_MAGIC)) {
      return res.status(400).json({ error: 'Not a valid SQLite database file' })
    }
    try {
      db.close()
      writeFileSync(DB_PATH, req.body)
      db = new Database(DB_PATH)
      db.pragma('journal_mode = WAL')
      res.json({ ok: true, size: req.body.length })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }
)

// --- Report (all data for export) ---
app.get('/api/report', (_req, res) => {
  const machines = db.prepare('SELECT * FROM machines ORDER BY id').all()
  const workorders = db.prepare(
    'SELECT w.*, m.name as machine_name FROM workorders w LEFT JOIN machines m ON w.machine_id = m.id ORDER BY w.created_at DESC'
  ).all()
  const pm = db.prepare(
    'SELECT p.*, m.name as machine_name FROM pm_schedules p LEFT JOIN machines m ON p.machine_id = m.id ORDER BY p.machine_id'
  ).all()
  const parts = db.prepare(
    'SELECT s.*, m.name as machine_name FROM spare_parts s LEFT JOIN machines m ON s.machine_id = m.id ORDER BY s.machine_id, s.id'
  ).all()
  res.json({ machines, workorders, pm, parts })
})

// --- MQTT ---
app.get('/api/mqtt/status', (_req, res) => res.json(mqttState))

app.get('/api/mqtt/config', (_req, res) => res.json(getMqttCfg() || {}))

app.post('/api/mqtt/config', (req, res) => {
  const cfg = req.body
  db.prepare("INSERT OR REPLACE INTO settings VALUES ('mqtt_config', ?)").run(JSON.stringify(cfg))
  connectMqtt(cfg)
  res.json({ ok: true })
})

app.post('/api/mqtt/disconnect', (_req, res) => {
  if (mqttClient) { mqttClient.end(true); mqttClient = null }
  mqttState = { state: 'disconnected', error: '' }
  res.json({ ok: true })
})

app.get('/api/mqtt/mappings', (_req, res) => {
  res.json(db.prepare('SELECT * FROM mqtt_mappings ORDER BY id').all())
})

app.post('/api/mqtt/mapping', (req, res) => {
  const { topic, machine_id, field, json_key, value_map } = req.body
  if (!topic || !machine_id || !field) return res.status(400).json({ error: 'topic, machine_id, field required' })
  if (!MQTT_FIELDS.includes(field)) return res.status(400).json({ error: 'Invalid field' })
  const r = db.prepare(
    'INSERT INTO mqtt_mappings (topic, machine_id, field, json_key, value_map) VALUES (?,?,?,?,?)'
  ).run(topic, machine_id, field, json_key || null, value_map || null)
  if (mqttClient?.connected) mqttClient.subscribe(topic)
  res.json({ id: r.lastInsertRowid })
})

app.delete('/api/mqtt/mapping/:id', (req, res) => {
  db.prepare('DELETE FROM mqtt_mappings WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

// --- Health check ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Serve built React app (production / Docker) ---
const distDir = join(__dirname, 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('/{*path}', (_req, res) => res.sendFile(join(distDir, 'index.html')))
}

// --- HTTPS helpers (production / Docker only — openssl not available on Windows dev) ---
const SKIP_PREFIXES = ['169.254.', '172.17.', '172.18.', '172.19.', '172.20.']
function getLanIPs() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal && !SKIP_PREFIXES.some(p => i.address.startsWith(p)))
}

const DATA_DIR  = resolve(dirname(DB_PATH))
const CERT_FILE = join(DATA_DIR, 'cert.pem')
const KEY_FILE  = join(DATA_DIR, 'key.pem')

function ensureCert() {
  if (existsSync(CERT_FILE) && existsSync(KEY_FILE)) return
  mkdirSync(DATA_DIR, { recursive: true })
  console.log('Generating self-signed certificate...')
  const ips = ['127.0.0.1', ...getLanIPs().map(i => i.address)]
  if (config.serverIp && !ips.includes(config.serverIp)) {
    ips.push(config.serverIp)
    console.log(`  Adding SERVER_IP to cert SAN: ${config.serverIp}`)
  }
  const san = ips.map(ip => `IP:${ip}`).join(',')
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}"` +
    ` -days 365 -nodes -subj "/CN=mapm-ar" -addext "subjectAltName=${san}"`,
    { stdio: 'pipe' }
  )
  console.log('Certificate written to data/cert.pem + data/key.pem')
}

// --- Start server ---
// Production (NODE_ENV=production): HTTPS so camera works on LAN devices.
// Dev: plain HTTP — Vite handles HTTPS on its own port.
if (process.env.NODE_ENV === 'production') {
  ensureCert()
  const server = https.createServer(
    { key: readFileSync(KEY_FILE), cert: readFileSync(CERT_FILE) },
    app
  )
  server.listen(config.port, '0.0.0.0', () => {
    const ips = getLanIPs().map(i => `https://${i.address}:${config.port}`)
    console.log(`\nMA/PM AR Inspector — HTTPS`)
    console.log(`  Local:   https://localhost:${config.port}`)
    ips.forEach(u => console.log(`  Network: ${u}`))
    console.log(`\n  Accept the self-signed cert warning on first visit.`)
  })
} else {
  app.listen(config.port, '0.0.0.0', () =>
    console.log(`MA/PM API server running on http://localhost:${config.port}`)
  )
}
