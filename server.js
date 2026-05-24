import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { statSync, writeFileSync, existsSync, mkdirSync } from 'fs'
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
`)

// Seed demo data once
const empty = db.prepare('SELECT COUNT(*) as n FROM machines').get().n === 0
if (config.demoSeed && empty) {
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
  console.log('Demo data seeded.')
}

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
  if (config.demoSeed) {
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
  }
  res.json({ ok: true, seeded: config.demoSeed })
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

// --- Health check ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Serve built React app (production / Docker) ---
const distDir = join(__dirname, 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')))
}

app.listen(config.port, '0.0.0.0', () =>
  console.log(`MA/PM API server running on http://0.0.0.0:${config.port}`)
)
