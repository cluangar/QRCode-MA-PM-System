import { useState, useEffect } from 'react'

const MACHINES = [
  { value: 'MCH-001', label: 'CNC Lathe #3 — Line B (Fault)' },
  { value: 'MCH-002', label: 'Hydraulic Press #1 — Line A (OK)' },
  { value: 'MCH-003', label: 'Conveyor Belt #7 — Line C (PM Due)' },
]

export function LandingScreen({ onStartCamera, onLoadDemo }) {
  const [selected, setSelected] = useState('MCH-001')
  const [showDemo, setShowDemo] = useState(false)

  useEffect(() => {
    fetch('/api/machines')
      .then(r => r.json())
      .then(list => setShowDemo(list.length > 0))
      .catch(() => setShowDemo(true))
  }, [])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      zIndex: 30, background: 'var(--bg)', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '.15em', marginBottom: '16px' }}>
        MA/PM AR INSPECTOR v1.0
      </div>
      <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '6px' }}>AR Machine Inspector</div>
      <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: '280px' }}>
        Scan a QR code on any machine to view live MA/PM status overlay on camera.
      </div>

      {/* QR frame */}
      <div style={{
        width: '200px', height: '200px',
        border: '2px solid var(--green)', borderRadius: '12px',
        position: 'relative', margin: '24px auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {[
          { top: '-2px', left: '-2px',   borderWidth: '3px 0 0 3px',   borderRadius: '4px 0 0 0' },
          { top: '-2px', right: '-2px',  borderWidth: '3px 3px 0 0',   borderRadius: '0 4px 0 0' },
          { bottom: '-2px', left: '-2px',  borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 4px' },
          { bottom: '-2px', right: '-2px', borderWidth: '0 3px 3px 0', borderRadius: '0 0 4px 0' },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: '22px', height: '22px', borderColor: 'var(--green)', borderStyle: 'solid', ...s }} />
        ))}
        <div style={{
          position: 'absolute', left: '4px', right: '4px', height: '2px',
          background: 'var(--green)', opacity: 0.8,
          animation: 'qrscan 2s ease-in-out infinite',
        }} />
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity=".25">
          <rect x="8"  y="8"  width="26" height="26" rx="3" stroke="#00ff9d" strokeWidth="2"/>
          <rect x="14" y="14" width="14" height="14" rx="1" fill="#00ff9d"/>
          <rect x="46" y="8"  width="26" height="26" rx="3" stroke="#00ff9d" strokeWidth="2"/>
          <rect x="52" y="14" width="14" height="14" rx="1" fill="#00ff9d"/>
          <rect x="8"  y="46" width="26" height="26" rx="3" stroke="#00ff9d" strokeWidth="2"/>
          <rect x="14" y="52" width="14" height="14" rx="1" fill="#00ff9d"/>
          <rect x="46" y="46" width="8"  height="8"  rx="1" fill="#00ff9d"/>
          <rect x="58" y="46" width="8"  height="8"  rx="1" fill="#00ff9d"/>
          <rect x="46" y="58" width="8"  height="8"  rx="1" fill="#00ff9d"/>
          <rect x="58" y="58" width="8"  height="8"  rx="1" fill="#00ff9d"/>
        </svg>
      </div>

      <button
        onClick={onStartCamera}
        style={{
          width: '100%', background: 'var(--green-dim)',
          border: '1px solid var(--green-border)', borderRadius: '10px',
          color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: '13px',
          padding: '13px', cursor: 'pointer', fontWeight: 500,
          letterSpacing: '.08em', marginBottom: '10px',
        }}
      >
        &#x1F4F7; Scan QR / Start Camera
      </button>

      {showDemo && (
        <div style={{ width: '100%', marginTop: '10px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '.08em', marginBottom: '8px', textAlign: 'left' }}>
            — OR DEMO MODE —
          </div>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--green-border)', borderRadius: '10px',
              color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: '13px',
              padding: '12px 14px', marginBottom: '10px', outline: 'none', appearance: 'none',
            }}
          >
            {MACHINES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button
            onClick={() => onLoadDemo(selected)}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '12px',
              padding: '11px', cursor: 'pointer',
            }}
          >
            Load Demo Machine
          </button>
        </div>
      )}
    </div>
  )
}
