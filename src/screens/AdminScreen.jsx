import { useState, useEffect, useRef } from 'react'
import { isAdminAuthed } from '../components/AdminGate.jsx'

const G = '#00ff9d'
const R = '#ff4757'
const A = '#ffb020'
const B = '#38bdf8'
const D = '#4a5568'
const T = '#c8d6e5'
const MONO = 'IBM Plex Mono, monospace'
const STATUS_C = { Running: G, Fault: R, Idle: A, Maintenance: B }

const btn = (variant = 'dim') => ({
  borderRadius: '8px', fontFamily: MONO, fontSize: '12px',
  padding: '8px 14px', cursor: 'pointer', border: 'none',
  ...(variant === 'dim'   ? { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888' } : {}),
  ...(variant === 'green' ? { background: 'rgba(0,255,157,0.12)', border: `1px solid rgba(0,255,157,0.3)`, color: G } : {}),
})

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 90px', background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${value > 0 && color !== T ? color + '33' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '10px', padding: '12px 14px',
    }}>
      <div style={{ fontSize: '26px', fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '9px', color: D, fontFamily: MONO, letterSpacing: '.12em', marginTop: '5px' }}>
        {label}
      </div>
    </div>
  )
}

function NavCard({ icon, title, desc, href, badge }) {
  return (
    <a href={href} style={{
      display: 'block', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px',
      padding: '16px 14px', textDecoration: 'none', position: 'relative',
    }}>
      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: T, fontFamily: MONO }}>{title}</div>
      <div style={{ fontSize: '11px', color: D, marginTop: '3px', lineHeight: 1.4 }}>{desc}</div>
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: R, borderRadius: '10px', padding: '2px 7px',
          fontSize: '10px', color: '#fff', fontFamily: MONO, fontWeight: 700,
        }}>{badge}</div>
      )}
    </a>
  )
}

function AlertRow({ dot, text, sub }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, flexShrink: 0, marginTop: '4px' }} />
      <div>
        <div style={{ fontSize: '12px', color: T }}>{text}</div>
        <div style={{ fontSize: '10px', color: D, fontFamily: MONO, marginTop: '2px' }}>{sub}</div>
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminScreen() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  function load() {
    setLoading(true); setError('')
    fetch('/api/report')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(setData)
      .catch(() => setError('Cannot reach API server'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const machines   = data?.machines   || []
  const workorders = data?.workorders || []
  const pm         = data?.pm         || []
  const parts      = data?.parts      || []

  const stats = {
    total:     machines.length,
    running:   machines.filter(m => m.status === 'Running').length,
    fault:     machines.filter(m => m.status === 'Fault').length,
    idle:      machines.filter(m => m.status === 'Idle').length,
    openWOs:   workorders.filter(w => w.status !== 'Completed').length,
    highWOs:   workorders.filter(w => w.status !== 'Completed' && w.priority === 'High').length,
    overduePM: pm.filter(p => p.status === 'Overdue').length,
    lowStock:  parts.filter(p => p.qty_in_stock <= p.reorder_level).length,
  }

  const faultMachines = machines.filter(m => m.status === 'Fault')
  const overduePMs    = pm.filter(p => p.status === 'Overdue')
  const highWOs       = workorders.filter(w => w.status !== 'Completed' && w.priority === 'High')
  const lowParts      = parts.filter(p => p.qty_in_stock <= p.reorder_level)
  const alertCount    = faultMachines.length + overduePMs.length + highWOs.length + lowParts.length

  return (
    <div style={{ minHeight: '100vh', background: '#060a0f', color: T, fontFamily: 'IBM Plex Sans Thai, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: G, fontFamily: MONO, letterSpacing: '.05em' }}>
            ADMIN DASHBOARD
          </div>
          <div style={{ fontSize: '10px', color: D, fontFamily: MONO, letterSpacing: '.1em', marginTop: '2px' }}>
            MA/PM AR INSPECTOR
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btn('dim')} onClick={() => { sessionStorage.removeItem('mapm_admin_ok'); location.reload() }}>
            &#x1F6AA; Logout
          </button>
          <a href="/" style={{ ...btn('dim'), textDecoration: 'none', display: 'inline-block' }}>
            &#x2190; AR App
          </a>
        </div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── Stats ── */}
        <div style={{ fontSize: '9px', color: D, fontFamily: MONO, letterSpacing: '.12em', marginBottom: '10px' }}>
          OVERVIEW
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <StatCard label="MACHINES"   value={loading ? '…' : stats.total}     color={T} />
          <StatCard label="RUNNING"    value={loading ? '…' : stats.running}   color={G} />
          <StatCard label="FAULT"      value={loading ? '…' : stats.fault}     color={stats.fault     > 0 ? R : D} />
          <StatCard label="IDLE"       value={loading ? '…' : stats.idle}      color={stats.idle      > 0 ? A : D} />
          <StatCard label="OPEN WOs"   value={loading ? '…' : stats.openWOs}   color={stats.openWOs   > 0 ? A : D} />
          <StatCard label="OVERDUE PM" value={loading ? '…' : stats.overduePM} color={stats.overduePM > 0 ? R : D} />
          <StatCard label="LOW STOCK"  value={loading ? '…' : stats.lowStock}  color={stats.lowStock  > 0 ? R : D} />
        </div>

        {/* ── Nav cards ── */}
        <div style={{ fontSize: '9px', color: D, fontFamily: MONO, letterSpacing: '.12em', marginBottom: '10px' }}>
          MANAGE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          <NavCard icon="&#x2699;"  title="Machines"   desc="Add · Edit · Delete · PM · Parts" href="/?machines" badge={stats.fault} />
          <NavCard icon="&#x1F5A8;" title="Print QR"   desc="Printable labels for all machines" href="/?print" />
          <NavCard icon="&#x1F4CA;" title="Reports"    desc="Export CSV · Print summary" href="/?reports" badge={stats.highWOs} />
        </div>

        {/* ── DB Maintenance ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px', paddingTop: '24px' }}>
          <DBSection />
        </div>

        {/* ── Alerts ── */}
        {!loading && alertCount > 0 && (
          <>
            <div style={{ fontSize: '9px', color: R, fontFamily: MONO, letterSpacing: '.12em', marginBottom: '10px' }}>
              &#x26A0; ALERTS ({alertCount})
            </div>
            <div style={{ background: 'rgba(255,71,87,0.04)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: '10px', padding: '4px 14px', marginBottom: '24px' }}>
              {faultMachines.map(m => (
                <AlertRow key={m.id} dot={R} text={`${m.name} — Fault`} sub={`${m.id} · ${m.location || '—'} · ${m.runtime_hours} hrs`} />
              ))}
              {overduePMs.map(p => (
                <AlertRow key={p.id} dot={R} text={`${p.machine_name} — PM Overdue`} sub={`Next due: ${p.next_due_date || '—'} · ${p.frequency}`} />
              ))}
              {highWOs.map(w => (
                <AlertRow key={w.id} dot={A} text={`${w.machine_name} — High Priority WO`} sub={`${w.id} · ${w.assigned_to || 'Unassigned'} · Due: ${w.due_date || '—'}`} />
              ))}
              {lowParts.map(p => (
                <AlertRow key={p.id} dot={A} text={`${p.name} — Low Stock`} sub={`${p.machine_name} · ${p.qty_in_stock} ${p.unit} in stock (reorder at ${p.reorder_level})`} />
              ))}
            </div>
          </>
        )}

        {!loading && alertCount === 0 && data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '24px', background: 'rgba(0,255,157,0.04)', border: '1px solid rgba(0,255,157,0.15)', borderRadius: '10px', fontSize: '12px', color: G }}>
            <span>&#x2713;</span>
            <span>All systems normal — no alerts</span>
          </div>
        )}

        {/* ── Machine list ── */}
        {!loading && machines.length > 0 && (
          <>
            <div style={{ fontSize: '9px', color: D, fontFamily: MONO, letterSpacing: '.12em', marginBottom: '10px' }}>
              MACHINES ({machines.length})
            </div>
            <div>
              {machines.map(m => {
                const mPM    = pm.find(p => p.machine_id === m.id)
                const mWO    = workorders.find(w => w.machine_id === m.id && w.status !== 'Completed')
                const mParts = parts.filter(p => p.machine_id === m.id)
                const lowCt  = mParts.filter(p => p.qty_in_stock <= p.reorder_level).length
                return (
                  <a key={m.id} href="/?machines" style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 14px', marginBottom: '7px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '9px', textDecoration: 'none',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_C[m.status] || '#888', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: T, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: '10px', color: D, fontFamily: MONO, marginTop: '2px' }}>
                        {m.id} · {m.location || '—'} · {m.model || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                      <Tag color={STATUS_C[m.status] || '#888'} text={m.status} />
                      {mWO  && <Tag color={A} text="WO" />}
                      {mPM?.status === 'Overdue' && <Tag color={R} text="PM" />}
                      {lowCt > 0 && <Tag color={A} text={`${lowCt} low`} />}
                      <span style={{ color: D, fontSize: '10px', fontFamily: MONO }}>{m.runtime_hours} hrs</span>
                    </div>
                  </a>
                )
              })}
            </div>
          </>
        )}

        {/* Error / loading */}
        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ color: R, fontSize: '13px', marginBottom: '14px' }}>{error}</div>
            <button style={btn('dim')} onClick={load}>&#x21BB; Retry</button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── DB Maintenance section ────────────────────────────────────────────────────

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function DBChip({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px', padding: '8px 12px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: T, fontFamily: MONO }}>{value}</div>
      <div style={{ fontSize: '9px', color: D, fontFamily: MONO, letterSpacing: '.1em', marginTop: '3px' }}>{label}</div>
    </div>
  )
}

function DBSection() {
  const [stats,        setStats]        = useState(null)
  const [busy,         setBusy]         = useState('')
  const [msg,          setMsg]          = useState({ text: '', ok: true })
  const [confirm,      setConfirm]      = useState(false)
  const [days,         setDays]         = useState('0')
  const [restoreFile,    setRestoreFile]    = useState(null)
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [resetConfirm,   setResetConfirm]   = useState(false)
  const fileInputRef = useRef(null)

  function loadStats() {
    fetch('/api/db/stats').then(r => r.json()).then(setStats).catch(() => {})
  }
  useEffect(() => { loadStats() }, [])

  async function vacuum() {
    setBusy('vacuum'); setMsg({ text: '', ok: true })
    try {
      const r = await fetch('/api/db/vacuum', { method: 'POST' }).then(r => r.json())
      setMsg({ text: `Compacted — DB now ${fmtBytes(r.dbSize)}, WAL ${fmtBytes(r.walSize)}`, ok: true })
      loadStats()
    } catch { setMsg({ text: 'Vacuum failed', ok: false }) }
    setBusy('')
  }

  async function purge() {
    setBusy('purge'); setMsg({ text: '', ok: true })
    try {
      const r = await fetch('/api/db/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'completed_wo', days: Number(days) }),
      }).then(r => r.json())
      setMsg({ text: `Purged ${r.deleted} completed work order${r.deleted !== 1 ? 's' : ''}`, ok: true })
      loadStats()
    } catch { setMsg({ text: 'Purge failed', ok: false }) }
    setConfirm(false); setBusy('')
  }

  async function doReset() {
    setBusy('reset'); setMsg({ text: '', ok: true })
    try {
      const r = await fetch('/api/db/reset', { method: 'POST' }).then(r => r.json())
      setMsg({ text: r.seeded ? 'Database reset — demo data restored' : 'Database cleared', ok: true })
      loadStats()
    } catch { setMsg({ text: 'Reset failed', ok: false }) }
    setResetConfirm(false); setBusy('')
  }

  async function doRestore() {
    if (!restoreFile) return
    setBusy('restore'); setMsg({ text: '', ok: true })
    try {
      const r = await fetch('/api/db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: restoreFile,
      }).then(r => r.json())
      if (r.error) throw new Error(r.error)
      setMsg({ text: `Restored ${fmtBytes(r.size)} — reloading…`, ok: true })
      setTimeout(() => location.reload(), 1500)
    } catch (e) {
      setMsg({ text: `Restore failed: ${e.message}`, ok: false })
    }
    setRestoreFile(null); setRestoreConfirm(false); setBusy('')
  }

  const completedWOs = stats?.counts.completed_wo ?? 0

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '9px', color: D, fontFamily: MONO, letterSpacing: '.12em', marginBottom: '10px' }}>
        DATABASE MAINTENANCE
      </div>

      {/* Stats chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <DBChip label="DB FILE"      value={stats ? fmtBytes(stats.dbSize)  : '…'} />
        <DBChip label="WAL FILE"     value={stats ? fmtBytes(stats.walSize) : '…'} />
        <DBChip label="MACHINES"     value={stats?.counts.machines     ?? '…'} />
        <DBChip label="WORK ORDERS"  value={stats?.counts.workorders   ?? '…'} />
        <DBChip label="COMPLETED WOs" value={stats?.counts.completed_wo ?? '…'} />
        <DBChip label="PM SCHEDULES" value={stats?.counts.pm           ?? '…'} />
        <DBChip label="PARTS"        value={stats?.counts.parts        ?? '…'} />
      </div>

      {/* Hidden file input for restore */}
      <input
        ref={fileInputRef} type="file" accept=".db" style={{ display: 'none' }}
        onChange={e => { setRestoreFile(e.target.files[0] || null); setRestoreConfirm(!!e.target.files[0]); e.target.value = '' }}
      />

      {/* Action buttons */}
      {!confirm && !restoreConfirm && !resetConfirm ? (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={btn('dim')} onClick={vacuum} disabled={!!busy}>
            {busy === 'vacuum' ? '…' : '⚡ VACUUM & Compact'}
          </button>
          <button
            style={{ ...btn('dim'), color: completedWOs > 0 ? A : D, borderColor: completedWOs > 0 ? A + '66' : undefined }}
            onClick={() => setConfirm(true)}
            disabled={!!busy || completedWOs === 0}
          >
            &#x1F5D1; Purge Completed WOs ({completedWOs})
          </button>
          <a href="/api/db/backup"
            style={{ ...btn('dim'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            &#x2B07; Download Backup
          </a>
          <button style={btn('dim')} onClick={() => fileInputRef.current?.click()} disabled={!!busy}>
            &#x1F504; Restore Backup
          </button>
          <button
            style={{ ...btn('dim'), color: R, borderColor: R + '55' }}
            onClick={() => setResetConfirm(true)}
            disabled={!!busy}
          >
            &#x26A0; Reset Database
          </button>
        </div>
      ) : resetConfirm ? (
        <div style={{
          background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.35)',
          borderRadius: '10px', padding: '14px 16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: R, fontFamily: MONO, marginBottom: '6px' }}>
            &#x26A0; Reset entire database?
          </div>
          <div style={{ fontSize: '12px', color: T, lineHeight: 1.6, marginBottom: '12px' }}>
            This will permanently delete <span style={{ color: R, fontWeight: 600 }}>all machines, work orders, PM schedules, and parts</span>.
            {' '}Demo data (MCH-001 / 002 / 003) will be re-seeded if <span style={{ color: A, fontFamily: MONO }}>DEMO_SEED=true</span>.
            <br />
            <span style={{ color: R }}>This action cannot be undone.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{ ...btn('dim'), background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.5)', color: R }}
              onClick={doReset} disabled={busy === 'reset'}
            >
              {busy === 'reset' ? 'Resetting…' : '⚠ Yes, Reset Everything'}
            </button>
            <button style={btn('dim')} onClick={() => setResetConfirm(false)}>Cancel</button>
          </div>
        </div>
      ) : restoreConfirm ? (
        <div style={{
          background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          <div style={{ fontSize: '12px', color: T, marginBottom: '10px' }}>
            Replace current database with{' '}
            <span style={{ color: B, fontWeight: 600 }}>{restoreFile?.name}</span>
            {' '}({fmtBytes(restoreFile?.size)})?
            <span style={{ color: R, marginLeft: '6px' }}>This will overwrite all current data.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{ ...btn('dim'), background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', color: B }}
              onClick={doRestore} disabled={busy === 'restore'}
            >
              {busy === 'restore' ? 'Restoring…' : '✓ Yes, Restore'}
            </button>
            <button style={btn('dim')} onClick={() => { setRestoreFile(null); setRestoreConfirm(false) }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          <div style={{ fontSize: '12px', color: T, marginBottom: '10px' }}>
            Delete{' '}
            <span style={{ color: R, fontWeight: 600 }}>{completedWOs} completed work order{completedWOs !== 1 ? 's' : ''}</span>
            {' '}permanently?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', color: D, fontFamily: MONO }}>OLDER THAN</span>
            <select
              value={days}
              onChange={e => setDays(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '6px', color: T, fontFamily: MONO, fontSize: '12px',
                padding: '5px 8px', outline: 'none',
              }}
            >
              <option value="0">All completed</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{ ...btn('dim'), background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.35)', color: R }}
              onClick={purge} disabled={busy === 'purge'}
            >
              {busy === 'purge' ? 'Deleting…' : '✕ Yes, Delete'}
            </button>
            <button style={btn('dim')} onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {msg.text && (
        <div style={{ fontSize: '12px', color: msg.ok ? G : R, fontFamily: MONO, marginTop: '10px' }}>
          {msg.ok ? '✓' : '✗'} {msg.text}
        </div>
      )}
    </div>
  )
}

function Tag({ color, text }) {
  return (
    <span style={{
      fontSize: '9px', padding: '2px 6px', borderRadius: '5px', fontFamily: MONO,
      background: color + '22', border: `1px solid ${color}44`, color,
    }}>
      {text}
    </span>
  )
}
