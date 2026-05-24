import { useState, useEffect } from 'react'

const G = '#00ff9d', R = '#ff4757', A = '#ffb020', D = '#4a5568', T = '#c8d6e5'
const MONO = 'IBM Plex Mono, monospace'
const FIELDS = ['status', 'runtime_hours', 'today_hours', 'month_hours', 'pm_trigger_hours']
const FIELD_LABELS = {
  status: 'Status (Running/Fault/Idle/Maintenance)',
  runtime_hours: 'Runtime Hours (total)',
  today_hours: 'Today Hours',
  month_hours: 'Month Hours',
  pm_trigger_hours: 'PM Trigger Threshold (hrs)',
}

const s = {
  page:  { minHeight: '100vh', background: '#060a0f', color: T, fontFamily: 'IBM Plex Sans Thai, sans-serif' },
  hdr:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  h1:    { fontSize: '15px', fontWeight: 600, color: G, fontFamily: MONO, margin: 0 },
  card:  { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' },
  label: { fontSize: '10px', color: D, letterSpacing: '.1em', fontFamily: MONO, display: 'block', marginBottom: '4px' },
  input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: T, fontFamily: 'inherit', fontSize: '13px', padding: '9px 11px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' },
  row2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  row3:  { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  btn:   (v = 'dim') => ({
    borderRadius: '8px', fontFamily: MONO, fontSize: '12px', padding: '8px 14px', cursor: 'pointer', border: 'none',
    ...(v === 'green'  ? { background: 'rgba(0,255,157,0.12)', border: `1px solid rgba(0,255,157,0.3)`, color: G } : {}),
    ...(v === 'dim'    ? { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888' } : {}),
    ...(v === 'danger' ? { background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: R } : {}),
    ...(v === 'amber'  ? { background: 'rgba(255,176,32,0.1)', border: '1px solid rgba(255,176,32,0.3)', color: A } : {}),
  }),
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={s.input} />
    </div>
  )
}

function FSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...s.input, appearance: 'none', marginBottom: '10px' }}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ state }) {
  const color = state === 'connected' ? G : state === 'connecting' ? A : state === 'error' ? R : '#555'
  const label = state === 'connected' ? 'Connected' : state === 'connecting' ? 'Connecting…' : state === 'error' ? 'Error' : 'Disconnected'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color,
        boxShadow: state === 'connected' ? `0 0 6px ${G}` : 'none' }} />
      <span style={{ fontSize: '12px', color, fontFamily: MONO }}>{label}</span>
    </div>
  )
}

// ── Broker config section ─────────────────────────────────────────────────────
function BrokerConfig({ onStatusChange }) {
  const [cfg, setCfg]   = useState({ protocol: 'mqtt', host: '', port: '1883', username: '', password: '', clientId: '' })
  const [status, setStatus] = useState({ state: 'disconnected', error: '' })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/mqtt/config').then(r => r.json()).then(d => {
      if (d.host) setCfg(c => ({ ...c, ...d, port: String(d.port || 1883) }))
    }).catch(() => {})
    pollStatus()
  }, [])

  function pollStatus() {
    fetch('/api/mqtt/status').then(r => r.json()).then(s => {
      setStatus(s); onStatusChange?.(s.state)
    }).catch(() => {})
  }

  useEffect(() => {
    const id = setInterval(pollStatus, 3000)
    return () => clearInterval(id)
  }, [])

  async function saveAndConnect() {
    setBusy(true); setSaved(false)
    const body = { ...cfg, port: Number(cfg.port) || 1883 }
    await fetch('/api/mqtt/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setTimeout(pollStatus, 1500)
  }

  async function disconnect() {
    setBusy(true)
    await fetch('/api/mqtt/disconnect', { method: 'POST' })
    setBusy(false); pollStatus()
  }

  const f = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: D, fontFamily: MONO, letterSpacing: '.1em' }}>BROKER CONFIG</div>
        <StatusDot state={status.state} />
      </div>

      {status.error && (
        <div style={{ fontSize: '11px', color: R, fontFamily: MONO, marginBottom: '12px', padding: '8px 10px', background: 'rgba(255,71,87,0.08)', borderRadius: '6px' }}>
          {status.error}
        </div>
      )}

      <div style={s.row2}>
        <FSelect label="PROTOCOL" value={cfg.protocol} onChange={v => f('protocol', v)}
          options={[{ value: 'mqtt', label: 'mqtt (TCP)' }, { value: 'mqtts', label: 'mqtts (TLS)' }, { value: 'ws', label: 'ws (WebSocket)' }, { value: 'wss', label: 'wss (WebSocket TLS)' }]} />
        <Field label="PORT" type="number" value={cfg.port} onChange={v => f('port', v)} placeholder="1883" />
      </div>

      <Field label="BROKER HOST / IP" value={cfg.host} onChange={v => f('host', v)} placeholder="192.168.1.100  or  broker.example.com" />

      <div style={s.row2}>
        <Field label="USERNAME (optional)" value={cfg.username} onChange={v => f('username', v)} placeholder="—" />
        <Field label="PASSWORD (optional)" value={cfg.password} onChange={v => f('password', v)} type="password" placeholder="—" />
      </div>

      <Field label="CLIENT ID (optional — auto if blank)" value={cfg.clientId} onChange={v => f('clientId', v)} placeholder="mapm-factory-01" />

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button style={{ ...s.btn('green'), flex: 1 }} onClick={saveAndConnect} disabled={busy || !cfg.host}>
          {busy ? 'Connecting…' : saved ? '✓ Saved & Connecting' : '⚡ Save & Connect'}
        </button>
        {status.state === 'connected' && (
          <button style={s.btn('dim')} onClick={disconnect} disabled={busy}>Disconnect</button>
        )}
      </div>
    </div>
  )
}

// ── Add mapping form ──────────────────────────────────────────────────────────
function AddMappingForm({ machines, onAdded }) {
  const blank = { topic: '', machine_id: '', field: 'status', json_key: '', value_map: '' }
  const [d, setD] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')
  const f = (k, v) => setD(p => ({ ...p, [k]: v }))

  async function submit() {
    if (!d.topic || !d.machine_id) { setErr('Topic and machine are required'); return }
    setBusy(true); setErr('')
    const r = await fetch('/api/mqtt/mapping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    }).then(r => r.json())
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    setD(blank); onAdded()
  }

  return (
    <div style={{ background: 'rgba(0,255,157,0.03)', border: '1px solid rgba(0,255,157,0.15)', borderRadius: '10px', padding: '16px', marginTop: '14px' }}>
      <div style={{ fontSize: '10px', color: D, fontFamily: MONO, letterSpacing: '.1em', marginBottom: '14px' }}>ADD MAPPING</div>

      <Field label="MQTT TOPIC" value={d.topic} onChange={v => f('topic', v)}
        placeholder="factory/line-b/cnc-lathe/status" />

      <div style={s.row2}>
        <FSelect label="MACHINE" value={d.machine_id} onChange={v => f('machine_id', v)}
          options={[{ value: '', label: '— select —' }, ...machines.map(m => ({ value: m.id, label: `${m.id} — ${m.name}` }))]} />
        <FSelect label="DB FIELD" value={d.field} onChange={v => f('field', v)}
          options={FIELDS.map(f => ({ value: f, label: FIELD_LABELS[f] }))} />
      </div>

      <div style={s.row2}>
        <div>
          <Field label="JSON KEY (optional)" value={d.json_key} onChange={v => f('json_key', v)} placeholder='value' />
          <div style={{ fontSize: '10px', color: D, marginTop: '-8px', marginBottom: '10px' }}>
            Extract key from JSON payload, e.g. <span style={{ fontFamily: MONO }}>"value"</span> → {'{'}value: 1.23{'}'}
          </div>
        </div>
        <div>
          <Field label="VALUE MAP (optional)" value={d.value_map} onChange={v => f('value_map', v)} placeholder="0=Fault,1=Running" />
          <div style={{ fontSize: '10px', color: D, marginTop: '-8px', marginBottom: '10px' }}>
            Map raw payload to DB value, e.g. <span style={{ fontFamily: MONO }}>0=Fault,1=Running</span>
          </div>
        </div>
      </div>

      {err && <div style={{ color: R, fontSize: '11px', marginBottom: '8px' }}>✗ {err}</div>}
      <button style={{ ...s.btn('green'), width: '100%' }} onClick={submit} disabled={busy}>
        {busy ? 'Adding…' : '+ Add Mapping'}
      </button>
    </div>
  )
}

// ── Mapping row ───────────────────────────────────────────────────────────────
function MappingRow({ m, machines, onDelete }) {
  const machine = machines.find(x => x.id === m.machine_id)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: G, fontFamily: MONO, wordBreak: 'break-all' }}>{m.topic}</div>
        <div style={{ fontSize: '11px', color: D, fontFamily: MONO, marginTop: '3px' }}>
          {m.machine_id} {machine ? `— ${machine.name}` : ''} &nbsp;→&nbsp;
          <span style={{ color: T }}>{m.field}</span>
          {m.json_key  && <> &nbsp;·&nbsp; key: <span style={{ color: A }}>{m.json_key}</span></>}
          {m.value_map && <> &nbsp;·&nbsp; map: <span style={{ color: A }}>{m.value_map}</span></>}
        </div>
      </div>
      <button style={{ ...s.btn('danger'), padding: '5px 10px', fontSize: '11px', flexShrink: 0 }}
        onClick={() => onDelete(m.id)}>✕</button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function MQTTScreen() {
  const [machines,   setMachines]   = useState([])
  const [mappings,   setMappings]   = useState([])
  const [showAdd,    setShowAdd]    = useState(false)
  const [mqttConnected, setMqttConnected] = useState(false)

  const loadMachines = () => fetch('/api/machines').then(r => r.json()).then(setMachines).catch(() => {})
  const loadMappings = () => fetch('/api/mqtt/mappings').then(r => r.json()).then(setMappings).catch(() => {})

  useEffect(() => { loadMachines(); loadMappings() }, [])

  async function deleteMapping(id) {
    await fetch(`/api/mqtt/mapping/${id}`, { method: 'DELETE' })
    loadMappings()
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.hdr}>
        <span style={s.h1}>MQTT SENSOR MAPPING</span>
        <a href="/?admin" style={{ ...s.btn('dim'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Admin</a>
      </div>

      <div style={{ padding: '20px', maxWidth: '760px' }}>

        {/* Broker config */}
        <BrokerConfig onStatusChange={state => setMqttConnected(state === 'connected')} />

        {/* Mappings */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ fontSize: '11px', color: D, fontFamily: MONO, letterSpacing: '.1em' }}>
              SENSOR → FIELD MAPPINGS
              <span style={{ color: '#555', marginLeft: '8px' }}>({mappings.length})</span>
            </div>
            <button style={s.btn(showAdd ? 'dim' : 'green')} onClick={() => setShowAdd(v => !v)}>
              {showAdd ? 'Cancel' : '+ Add Mapping'}
            </button>
          </div>

          {!mqttConnected && (
            <div style={{ fontSize: '11px', color: A, fontFamily: MONO, padding: '8px 10px', background: 'rgba(255,176,32,0.06)', borderRadius: '6px', marginTop: '10px' }}>
              ⚠ MQTT not connected — mappings are saved but inactive until connected
            </div>
          )}

          {mappings.length === 0 && !showAdd && (
            <div style={{ fontSize: '12px', color: D, textAlign: 'center', padding: '28px 0' }}>
              No mappings yet — add one to start writing sensor values to the database
            </div>
          )}

          {mappings.map(m => (
            <MappingRow key={m.id} m={m} machines={machines} onDelete={deleteMapping} />
          ))}

          {showAdd && (
            <AddMappingForm machines={machines} onAdded={() => { loadMappings(); setShowAdd(false) }} />
          )}
        </div>

        {/* How it works */}
        <div style={{ ...s.card, borderColor: 'rgba(0,255,157,0.08)' }}>
          <div style={{ fontSize: '10px', color: D, fontFamily: MONO, letterSpacing: '.1em', marginBottom: '12px' }}>HOW IT WORKS</div>
          <div style={{ fontSize: '12px', color: D, lineHeight: 1.8 }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: T }}>1. Configure broker</span> — enter your MQTT broker host, port, and credentials above.
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: T }}>2. Add a mapping</span> — link an MQTT topic to a machine field. When a message arrives on that topic, the field is updated in the database immediately.
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: T }}>3. JSON Key</span> — if your sensor publishes JSON (e.g. <span style={{ fontFamily: MONO, color: A }}>{'{"value": 42.1}'}</span>), enter <span style={{ fontFamily: MONO, color: A }}>value</span> to extract that key.
            </div>
            <div>
              <span style={{ color: T }}>4. Value Map</span> — for status fields from digital sensors, map raw values: <span style={{ fontFamily: MONO, color: A }}>0=Fault,1=Running,2=Idle</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
