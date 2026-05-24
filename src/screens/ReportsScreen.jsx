import { useState, useEffect } from 'react'

const s = {
  page:   { minHeight: '100vh', background: '#060a0f', color: '#c8d6e5', fontFamily: 'IBM Plex Sans Thai, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', gap: '10px' },
  h1:     { fontSize: '15px', fontWeight: 600, color: '#00ff9d', fontFamily: 'IBM Plex Mono, monospace', margin: 0 },
  btn:    { borderRadius: '8px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', border: 'none' },
  green:  { background: 'rgba(0,255,157,0.12)', border: '1px solid rgba(0,255,157,0.3)', color: '#00ff9d' },
  dim:    { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888' },
  tab:    { padding: '8px 14px', borderRadius: '6px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', cursor: 'pointer', border: 'none', marginRight: '6px', marginBottom: '10px' },
}

const TABS = [
  { key: 'machines',   label: 'Machines' },
  { key: 'workorders', label: 'Work Orders' },
  { key: 'pm',         label: 'PM Schedule' },
  { key: 'parts',      label: 'Parts' },
]

const COLS = {
  machines: [
    { key: 'id',               label: 'ID' },
    { key: 'name',             label: 'Name' },
    { key: 'location',         label: 'Location' },
    { key: 'model',            label: 'Model' },
    { key: 'serial',           label: 'Serial' },
    { key: 'status',           label: 'Status',        color: true },
    { key: 'runtime_hours',    label: 'Runtime hrs' },
    { key: 'pm_trigger_hours', label: 'PM Trigger' },
    { key: 'today_hours',      label: "Today hrs" },
    { key: 'month_hours',      label: "Month hrs" },
  ],
  workorders: [
    { key: 'id',          label: 'WO ID' },
    { key: 'machine_id',  label: 'Machine ID' },
    { key: 'machine_name',label: 'Machine Name' },
    { key: 'type',        label: 'Type' },
    { key: 'priority',    label: 'Priority',  color: true },
    { key: 'status',      label: 'Status',    color: true },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'due_date',    label: 'Due Date' },
    { key: 'description', label: 'Description', wrap: true },
  ],
  pm: [
    { key: 'machine_id',    label: 'Machine ID' },
    { key: 'machine_name',  label: 'Machine Name' },
    { key: 'frequency',     label: 'Frequency' },
    { key: 'last_pm_date',  label: 'Last PM' },
    { key: 'next_due_date', label: 'Next Due' },
    { key: 'status',        label: 'Status', color: true },
    { key: 'tasks', label: 'Tasks', render: r => (r.tasks || '').split('\n').filter(Boolean).join(' | '), wrap: true },
  ],
  parts: [
    { key: 'id',            label: 'Part ID' },
    { key: 'machine_id',    label: 'Machine ID' },
    { key: 'machine_name',  label: 'Machine Name' },
    { key: 'name',          label: 'Part Name' },
    { key: 'qty_in_stock',  label: 'Qty' },
    { key: 'reorder_level', label: 'Reorder At' },
    { key: 'unit',          label: 'Unit' },
    { key: 'low_stock', label: 'Low Stock', color: true,
      render: r => r.qty_in_stock <= r.reorder_level ? 'LOW' : '' },
  ],
}

const STATUS_C = {
  Running: '#00ff9d', Fault: '#ff4757', Idle: '#ffb020', Maintenance: '#38bdf8',
  Overdue: '#ff4757', Scheduled: '#00ff9d', Completed: '#38bdf8',
  Open: '#ffb020', 'In Progress': '#38bdf8',
  High: '#ff4757', Medium: '#ffb020', Normal: '#ffb020', Low: '#888',
  LOW: '#ff4757',
}

function Table({ rows, cols }) {
  if (!rows || rows.length === 0)
    return <div style={{ textAlign: 'center', color: '#4a5568', padding: '40px 0', fontSize: '13px' }}>No data</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{
                textAlign: 'left', padding: '8px 10px', color: '#4a5568',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                whiteSpace: 'nowrap', fontSize: '10px', letterSpacing: '.08em',
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {cols.map(c => {
                const val = c.render ? c.render(r) : (r[c.key] ?? '—')
                const color = c.color ? (STATUS_C[val] || '#c8d6e5') : '#c8d6e5'
                return (
                  <td key={c.key} style={{
                    padding: '8px 10px', color,
                    whiteSpace: c.wrap ? 'normal' : 'nowrap',
                    maxWidth: c.wrap ? '200px' : 'none',
                    fontSize: '12px',
                  }}>
                    {val === '' ? <span style={{ color: '#2a3040' }}>—</span> : val}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReportsScreen() {
  const [tab, setTab]         = useState('machines')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  function load() {
    setLoading(true)
    setError('')
    fetch('/api/report')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(setData)
      .catch(() => setError('Cannot load — is the API server running? Try npm start'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function downloadCSV(key) {
    const rows = data?.[key] || []
    const cols = COLS[key]
    const header = cols.map(c => c.label)
    const csvRows = rows.map(r =>
      cols.map(c => {
        const val = c.render ? c.render(r) : (r[c.key] ?? '')
        return `"${val.toString().replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = '﻿' + [header.join(','), ...csvRows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${key}-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const rows = data?.[tab] || []
  const cols = COLS[tab]

  return (
    <div style={s.page}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-title { display: block !important; }
          body, div { background: white !important; color: black !important; }
          th, td { color: black !important; border-color: #ccc !important; }
          table { border: 1px solid #ccc; }
        }
        .print-title { display: none; }
      `}</style>

      <div style={s.header} className="no-print">
        <span style={s.h1}>REPORTS</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={{ ...s.btn, ...s.green }} onClick={() => downloadCSV(tab)}>&#x2B07; Export CSV</button>
          <button style={{ ...s.btn, ...s.dim }}   onClick={() => window.print()}>&#x1F5A8; Print</button>
          <a href="/?admin" style={{ ...s.btn, ...s.dim, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>&#x2190; Admin</a>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)' }} className="no-print">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...s.tab,
            background: tab === t.key ? 'rgba(0,255,157,0.1)' : 'transparent',
            color:      tab === t.key ? '#00ff9d' : '#888',
            border:     tab === t.key ? '1px solid rgba(0,255,157,0.25)' : '1px solid transparent',
          }}>
            {t.label}
            {data && (
              <span style={{ marginLeft: '5px', fontSize: '10px', opacity: 0.6 }}>
                ({data[t.key]?.length ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="print-title" style={{ padding: '16px 20px 0', fontSize: '14px', fontWeight: 600 }}>
        {TABS.find(t => t.key === tab)?.label} Report — {new Date().toLocaleDateString()}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading && <div style={{ textAlign: 'center', color: '#4a5568', padding: '40px 0' }}>Loading...</div>}
        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ color: '#ff4757', fontSize: '13px', marginBottom: '14px' }}>{error}</div>
            <button style={{ ...s.btn, ...s.dim }} onClick={load}>&#x21BB; Retry</button>
          </div>
        )}
        {!loading && !error && <Table rows={rows} cols={cols} />}
      </div>
    </div>
  )
}
