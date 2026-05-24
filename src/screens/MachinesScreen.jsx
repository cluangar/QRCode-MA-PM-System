import { useState, useEffect } from 'react'

const BASE = '/api'
const api = {
  machines: ()        => fetch(`${BASE}/machines`).then(r => r.json()),
  machine:  id        => fetch(`${BASE}/machine/${id}`).then(r => r.json()),
  pm:       machineId => fetch(`${BASE}/pm/machine/${machineId}`).then(r => r.json()),
  parts:    machineId => fetch(`${BASE}/parts/${machineId}`).then(r => r.json()),
  createMachine: d    => fetch(`${BASE}/machine`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }).then(r => r.json()),
  updateMachine: (id,d) => fetch(`${BASE}/machine/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }).then(r => r.json()),
  deleteMachine: id   => fetch(`${BASE}/machine/${id}`, { method:'DELETE' }).then(r => r.json()),
  savePM:  (mid,d)    => fetch(`${BASE}/pm/machine/${mid}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }).then(r => r.json()),
  addPart: d          => fetch(`${BASE}/parts`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }).then(r => r.json()),
  updatePart: (id,d)  => fetch(`${BASE}/parts/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }).then(r => r.json()),
  deletePart: id      => fetch(`${BASE}/parts/${id}`, { method:'DELETE' }).then(r => r.json()),
}

const STATUS_COLOR = { Running:'#00ff9d', Fault:'#ff4757', Idle:'#ffb020', Maintenance:'#38bdf8' }

const s = {
  page:   { minHeight:'100vh', background:'#060a0f', color:'#c8d6e5', fontFamily:'IBM Plex Sans Thai, sans-serif', padding:'0' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' },
  h1:     { fontSize:'15px', fontWeight:600, color:'#00ff9d', fontFamily:'IBM Plex Mono, monospace', margin:0 },
  btn:    { borderRadius:'8px', fontFamily:'IBM Plex Mono, monospace', fontSize:'12px', padding:'8px 14px', cursor:'pointer', border:'none' },
  green:  { background:'rgba(0,255,157,0.12)', border:'1px solid rgba(0,255,157,0.3)', color:'#00ff9d' },
  dim:    { background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#888' },
  danger: { background:'rgba(255,71,87,0.1)', border:'1px solid rgba(255,71,87,0.3)', color:'#ff4757' },
  card:   { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'14px 16px', marginBottom:'10px', cursor:'pointer' },
  input:  { width:'100%', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:'7px', color:'#c8d6e5', fontFamily:'inherit', fontSize:'13px', padding:'9px 11px', outline:'none', boxSizing:'border-box', marginBottom:'10px' },
  label:  { fontSize:'10px', color:'#4a5568', letterSpacing:'.1em', fontFamily:'IBM Plex Mono, monospace', display:'block', marginBottom:'4px' },
  row:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' },
  tab:    { padding:'8px 14px', borderRadius:'6px', fontFamily:'IBM Plex Mono, monospace', fontSize:'11px', cursor:'pointer', border:'none', marginRight:'6px' },
}

function Field({ label, value, onChange, type='text', placeholder='', as='input', rows=3 }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      {as === 'textarea'
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
            style={{ ...s.input, resize:'vertical', fontFamily:'inherit' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={s.input} />
      }
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...s.input, appearance:'none', marginBottom:'10px' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ── Machine form (Info tab) ─────────────────────────────────────────────────
function MachineInfoForm({ draft, setDraft, isNew }) {
  const f = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  return (
    <>
      <div style={s.row}>
        <Field label="MACHINE ID" value={draft.id || ''} onChange={v => f('id', v)} placeholder="MCH-004" />
        <Field label="NAME" value={draft.name || ''} onChange={v => f('name', v)} placeholder="CNC Lathe #4" />
      </div>
      <div style={s.row}>
        <Field label="LOCATION" value={draft.location || ''} onChange={v => f('location', v)} placeholder="Line A Bay 2" />
        <Field label="MODEL" value={draft.model || ''} onChange={v => f('model', v)} placeholder="Mazak QT-200" />
      </div>
      <div style={s.row}>
        <Field label="SERIAL NO." value={draft.serial || ''} onChange={v => f('serial', v)} placeholder="SN-..." />
        <Select label="STATUS" value={draft.status || 'Running'} onChange={v => f('status', v)}
          options={['Running','Fault','Idle','Maintenance']} />
      </div>
      <div style={s.row}>
        <Field label="RUNTIME HOURS" type="number" value={draft.runtime_hours ?? ''} onChange={v => f('runtime_hours', v)} placeholder="0" />
        <Field label="PM TRIGGER (hrs)" type="number" value={draft.pm_trigger_hours ?? ''} onChange={v => f('pm_trigger_hours', v)} placeholder="500" />
      </div>
      <div style={s.row}>
        <Field label="TODAY HOURS" type="number" value={draft.today_hours ?? ''} onChange={v => f('today_hours', v)} placeholder="0" />
        <Field label="MONTH HOURS" type="number" value={draft.month_hours ?? ''} onChange={v => f('month_hours', v)} placeholder="0" />
      </div>
    </>
  )
}

// ── PM tab ──────────────────────────────────────────────────────────────────
function PMForm({ machineId, onSaved }) {
  const [pm, setPM] = useState({ frequency:'', last_pm_date:'', next_due_date:'', status:'Scheduled', tasks:'' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.pm(machineId).then(d => { if (d) setPM({ frequency:d.frequency||'', last_pm_date:d.last_pm_date||'', next_due_date:d.next_due_date||'', status:d.status||'Scheduled', tasks:d.tasks||'' }) })
  }, [machineId])

  const f = (k, v) => setPM(d => ({ ...d, [k]: v }))

  async function save() {
    setBusy(true)
    await api.savePM(machineId, pm)
    setBusy(false)
    onSaved('PM schedule saved')
  }

  return (
    <>
      <div style={s.row}>
        <Field label="FREQUENCY" value={pm.frequency} onChange={v => f('frequency', v)} placeholder="Every 500 hrs" />
        <Select label="STATUS" value={pm.status} onChange={v => f('status', v)}
          options={['Scheduled','Overdue','Completed','In Progress']} />
      </div>
      <div style={s.row}>
        <Field label="LAST PM DATE" type="date" value={pm.last_pm_date} onChange={v => f('last_pm_date', v)} />
        <Field label="NEXT DUE DATE" type="date" value={pm.next_due_date} onChange={v => f('next_due_date', v)} />
      </div>
      <Field label="TASKS (one per line)" as="textarea" rows={5}
        value={pm.tasks} onChange={v => f('tasks', v)}
        placeholder={'Inspect bearings\nCheck coolant\nLubricate rails'} />
      <button style={{ ...s.btn, ...s.green, width:'100%' }} onClick={save} disabled={busy}>
        {busy ? 'Saving...' : 'Save PM Schedule'}
      </button>
    </>
  )
}

// ── Parts tab ───────────────────────────────────────────────────────────────
function PartsForm({ machineId, onSaved }) {
  const [parts, setParts]   = useState([])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState({ name:'', qty_in_stock:0, reorder_level:5, unit:'pcs' })

  const load = () => api.parts(machineId).then(setParts)
  useEffect(() => { load() }, [machineId])

  async function addPart() {
    if (!draft.name) return
    await api.addPart({ ...draft, machine_id: machineId })
    setDraft({ name:'', qty_in_stock:0, reorder_level:5, unit:'pcs' })
    setAdding(false)
    load()
    onSaved('Part added')
  }

  async function deletePart(id) {
    await api.deletePart(id)
    load()
  }

  async function updateQty(id, qty) {
    await api.updatePart(id, { qty_in_stock: Number(qty) })
    load()
  }

  const f = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  return (
    <>
      {parts.length === 0 && !adding && (
        <div style={{ fontSize:'12px', color:'#4a5568', textAlign:'center', padding:'20px 0' }}>No parts yet</div>
      )}
      {parts.map(p => (
        <div key={p.id} style={{ ...s.card, cursor:'default', display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', marginBottom:'6px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', color: p.qty_in_stock <= p.reorder_level ? '#ff4757' : '#c8d6e5' }}>{p.name}</div>
            <div style={{ fontSize:'10px', color:'#4a5568', fontFamily:'monospace' }}>Reorder at {p.reorder_level} {p.unit}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <input type="number" defaultValue={p.qty_in_stock}
              onBlur={e => updateQty(p.id, e.target.value)}
              style={{ ...s.input, width:'60px', marginBottom:0, textAlign:'center', padding:'5px 6px' }} />
            <span style={{ fontSize:'11px', color:'#4a5568' }}>{p.unit}</span>
            <button style={{ ...s.btn, ...s.danger, padding:'5px 8px', fontSize:'11px' }} onClick={() => deletePart(p.id)}>✕</button>
          </div>
        </div>
      ))}

      {adding ? (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'12px', marginTop:'8px' }}>
          <Field label="PART NAME" value={draft.name} onChange={v => f('name', v)} placeholder="Spindle Bearing 6205" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            <Field label="QTY" type="number" value={draft.qty_in_stock} onChange={v => f('qty_in_stock', v)} />
            <Field label="REORDER AT" type="number" value={draft.reorder_level} onChange={v => f('reorder_level', v)} />
            <Field label="UNIT" value={draft.unit} onChange={v => f('unit', v)} placeholder="pcs" />
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button style={{ ...s.btn, ...s.green, flex:1 }} onClick={addPart}>Add Part</button>
            <button style={{ ...s.btn, ...s.dim }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button style={{ ...s.btn, ...s.dim, width:'100%', marginTop:'8px' }} onClick={() => setAdding(true)}>
          + Add Part
        </button>
      )}
    </>
  )
}

// ── Edit drawer ──────────────────────────────────────────────────────────────
function MachineDrawer({ machine, isNew, onClose, onSaved, onDeleted }) {
  const [tab, setTab]   = useState('info')
  const [draft, setDraft] = useState(machine || { id:'', name:'', location:'', model:'', serial:'', status:'Running', runtime_hours:0, pm_trigger_hours:500, today_hours:0, month_hours:0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError(''); setBusy(true)
    try {
      if (isNew) {
        const res = await api.createMachine(draft)
        if (res.error) { setError(res.error); setBusy(false); return }
      } else {
        const { id, ...fields } = draft
        await api.updateMachine(draft.id, fields)
      }
      onSaved(isNew ? 'Machine created' : 'Machine updated')
    } catch (e) { setError(e.message) }
    setBusy(false)
  }

  async function del() {
    if (!confirm(`Delete ${draft.id} and all its data?`)) return
    await api.deleteMachine(draft.id)
    onDeleted()
  }

  const tabs = [
    { key:'info',  label:'Info' },
    { key:'pm',    label:'PM Schedule', disabled: isNew },
    { key:'parts', label:'Parts',       disabled: isNew },
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{
        position:'relative', width:'100%', maxHeight:'92vh',
        background:'#0d1117', borderRadius:'16px 16px 0 0',
        border:'1px solid rgba(255,255,255,0.1)', overflowY:'auto', padding:'20px',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ fontSize:'14px', fontWeight:600, color:'#00ff9d', fontFamily:'IBM Plex Mono, monospace' }}>
            {isNew ? 'New Machine' : draft.id}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {!isNew && <button style={{ ...s.btn, ...s.danger, fontSize:'11px', padding:'6px 10px' }} onClick={del}>Delete</button>}
            <button style={{ ...s.btn, ...s.dim, fontSize:'11px', padding:'6px 10px' }} onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', marginBottom:'16px', borderBottom:'1px solid rgba(255,255,255,0.07)', paddingBottom:'10px' }}>
          {tabs.map(t => (
            <button key={t.key} disabled={t.disabled} onClick={() => setTab(t.key)}
              style={{
                ...s.tab,
                background: tab === t.key ? 'rgba(0,255,157,0.1)' : 'transparent',
                color: t.disabled ? '#333' : tab === t.key ? '#00ff9d' : '#888',
                border: tab === t.key ? '1px solid rgba(0,255,157,0.25)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'info'  && <MachineInfoForm draft={draft} setDraft={setDraft} isNew={isNew} />}
        {tab === 'pm'    && <PMForm machineId={draft.id} onSaved={msg => { onSaved(msg) }} />}
        {tab === 'parts' && <PartsForm machineId={draft.id} onSaved={msg => { onSaved(msg) }} />}

        {tab === 'info' && (
          <>
            {error && <div style={{ color:'#ff4757', fontSize:'12px', marginBottom:'8px' }}>✗ {error}</div>}
            <button style={{ ...s.btn, ...s.green, width:'100%', padding:'11px' }} onClick={save} disabled={busy}>
              {busy ? 'Saving...' : isNew ? 'Create Machine' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────
export function MachinesScreen() {
  const [machines,    setMachines]    = useState([])
  const [selected,    setSelected]    = useState(null)
  const [isNew,       setIsNew]       = useState(false)
  const [toast,       setToast]       = useState('')
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search,      setSearch]      = useState('')

  const load = () => api.machines().then(setMachines).catch(() => setMachines([]))
  useEffect(() => { load() }, [])

  const filtered = machines.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (m.id + ' ' + m.name + ' ' + (m.location || '') + ' ' + (m.model || '') + ' ' + m.status)
      .toLowerCase().includes(q)
  })

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function openNew() { setSelected(null); setIsNew(true) }
  function openEdit(m) { setSelected(m); setIsNew(false) }
  function closeDrawer() { setSelected(null); setIsNew(false) }

  function onSaved(msg) { showToast(msg); closeDrawer(); load() }
  function onDeleted()  { showToast('Machine deleted'); closeDrawer(); load() }

  function toggleSelectMode() {
    setSelectMode(v => !v)
    setSelectedIds(new Set())
  }

  function toggleId(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function printSelected() {
    if (selectedIds.size === 0) return
    window.location.href = '/?print&ids=' + [...selectedIds].join(',')
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} machine${selectedIds.size !== 1 ? 's' : ''} and all their data?`)) return
    for (const id of selectedIds) await api.deleteMachine(id)
    showToast(`${selectedIds.size} machine${selectedIds.size !== 1 ? 's' : ''} deleted`)
    setSelectMode(false)
    setSelectedIds(new Set())
    load()
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.h1}>MACHINE MANAGEMENT</span>
        <div style={{ display:'flex', gap:'8px' }}>
          {!selectMode && <button style={{ ...s.btn, ...s.green }} onClick={openNew}>+ Add Machine</button>}
          <button
            style={{ ...s.btn, ...(selectMode ? s.green : s.dim) }}
            onClick={toggleSelectMode}
          >
            {selectMode ? '✕ Cancel' : 'Select'}
          </button>
          {!selectMode && <a href="/?admin" style={{ ...s.btn, ...s.dim, textDecoration:'none', display:'flex', alignItems:'center' }}>← Admin</a>}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding:'12px 20px 0' }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, location, model, status…"
          style={{ ...s.input, marginBottom:0, paddingLeft:'34px',
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E")`,
            backgroundRepeat:'no-repeat', backgroundPosition:'10px center',
          }}
        />
      </div>

      {/* Machine list */}
      <div style={{ padding:'12px 20px', paddingBottom: selectMode ? '80px' : '16px' }}>
        {machines.length === 0 && (
          <div style={{ textAlign:'center', color:'#4a5568', padding:'40px 0', fontSize:'13px' }}>
            No machines yet — click + Add Machine to create one
          </div>
        )}
        {machines.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'#4a5568', padding:'40px 0', fontSize:'13px' }}>
            No machines match "{search}"
          </div>
        )}
        {filtered.map(m => {
          const checked = selectedIds.has(m.id)
          return (
            <div key={m.id} style={{ ...s.card, outline: checked ? '1px solid rgba(0,255,157,0.4)' : 'none' }}
              onClick={() => selectMode ? toggleId(m.id) : openEdit(m)}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                {selectMode && (
                  <div style={{
                    width:'18px', height:'18px', borderRadius:'4px', flexShrink:0,
                    border: checked ? '2px solid #00ff9d' : '2px solid #444',
                    background: checked ? 'rgba(0,255,157,0.15)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {checked && <span style={{ color:'#00ff9d', fontSize:'11px', lineHeight:1 }}>✓</span>}
                  </div>
                )}
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0, background: STATUS_COLOR[m.status] || '#888' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:500, color:'#c8d6e5' }}>{m.name}</div>
                  <div style={{ fontSize:'11px', color:'#4a5568', fontFamily:'IBM Plex Mono, monospace', marginTop:'2px' }}>
                    {m.id} · {m.location || '—'} · {m.model || '—'}
                  </div>
                </div>
                <div style={{ fontSize:'11px', color: STATUS_COLOR[m.status] || '#888', fontFamily:'IBM Plex Mono, monospace' }}>
                  {m.status}
                </div>
                {!selectMode && <span style={{ color:'#4a5568', fontSize:'16px' }}>›</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selection action bar */}
      {selectMode && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:'#0d1117', borderTop:'1px solid rgba(255,255,255,0.1)',
          padding:'12px 20px', display:'flex', alignItems:'center', gap:'10px',
          zIndex:150,
        }}>
          <span style={{ fontSize:'12px', color:'#888', fontFamily:'IBM Plex Mono, monospace', flex:1 }}>
            {selectedIds.size} selected
          </span>
          <button
            style={{ ...s.btn, ...s.green, opacity: selectedIds.size === 0 ? 0.4 : 1 }}
            disabled={selectedIds.size === 0}
            onClick={printSelected}
          >
            Print QR →
          </button>
          <button
            style={{ ...s.btn, ...s.danger, opacity: selectedIds.size === 0 ? 0.4 : 1 }}
            disabled={selectedIds.size === 0}
            onClick={deleteSelected}
          >
            Delete →
          </button>
        </div>
      )}

      {/* Drawer */}
      {(selected || isNew) && (
        <MachineDrawer
          machine={selected}
          isNew={isNew}
          onClose={closeDrawer}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
          background:'rgba(0,255,157,0.15)', border:'1px solid rgba(0,255,157,0.3)',
          borderRadius:'8px', padding:'10px 18px', fontSize:'12px', color:'#00ff9d',
          fontFamily:'IBM Plex Mono, monospace', zIndex:200, pointerEvents:'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
