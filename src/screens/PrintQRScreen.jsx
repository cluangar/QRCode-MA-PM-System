import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

const CARD = {
  width: '200px',
  border: '1.5px solid #333',
  borderRadius: '8px',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  background: '#fff',
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
}

const BADGE = {
  fontSize: '12px',
  fontFamily: 'monospace',
  color: '#000',
  marginTop: '4px',
  background: '#f0f0f0',
  borderRadius: '4px',
  padding: '3px 8px',
  letterSpacing: '.05em',
}

function QRCanvas({ value }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, {
        width: 160, margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }
  }, [value])
  return <canvas ref={ref} style={{ display: 'block' }} />
}

function UrlLabel({ url }) {
  return (
    <div style={CARD}>
      <div style={{ fontSize: '10px', color: '#666', letterSpacing: '.1em', fontFamily: 'monospace' }}>
        MA/PM AR INSPECTOR
      </div>
      <QRCanvas value={url} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>Open AR Inspector</div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Scan to open app on phone</div>
        <div style={{ ...BADGE, fontSize: '10px', wordBreak: 'break-all', letterSpacing: '.02em' }}>{url}</div>
      </div>
    </div>
  )
}

function MachineLabel({ machine }) {
  return (
    <div style={CARD}>
      <div style={{ fontSize: '10px', color: '#666', letterSpacing: '.1em', fontFamily: 'monospace' }}>
        MA/PM AR INSPECTOR
      </div>
      <QRCanvas value={machine.id} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>{machine.name}</div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{machine.location}</div>
        <div style={BADGE}>{machine.id}</div>
      </div>
    </div>
  )
}

const SECTION_HEADING = {
  fontSize: '12px', fontWeight: 600, color: '#888',
  letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px',
}

export function PrintQRScreen() {
  const [machines, setMachines] = useState([])
  const url = `${window.location.protocol}//${window.location.host}`

  const filterIds = new URLSearchParams(window.location.search).get('ids')
  const idSet = filterIds ? new Set(filterIds.split(',')) : null

  useEffect(() => {
    fetch('/api/machines')
      .then(r => r.json())
      .then(all => setMachines(idSet ? all.filter(m => idSet.has(m.id)) : all))
      .catch(() => {})
  }, [])

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '32px', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div className="no-print" style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#111' }}>Print QR Labels</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#555' }}>
          {idSet
            ? <><strong>{machines.length} machine{machines.length !== 1 ? 's' : ''}</strong> selected for printing.</>
            : <>Post the <strong>Web App URL</strong> label at the entrance so workers can scan to open the app. Attach each <strong>machine label</strong> to the corresponding machine.</>
          }
        </p>
        <button
          onClick={() => window.print()}
          style={{
            background: '#000', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '10px 22px',
            fontSize: '13px', cursor: 'pointer', marginRight: '10px',
          }}
        >
          Print Labels
        </button>
        <a
          href="/?admin"
          style={{
            display: 'inline-block', background: 'transparent', color: '#555',
            border: '1px solid #ccc', borderRadius: '6px',
            padding: '10px 18px', fontSize: '13px', textDecoration: 'none',
          }}
        >
          ← Admin
        </a>
      </div>

      {/* Section 1: Web App URL */}
      <div className="no-print" style={SECTION_HEADING}>Web App URL</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '40px' }}>
        <UrlLabel url={url} />
      </div>

      {/* Section 2: Machine Labels */}
      <div className="no-print" style={SECTION_HEADING}>Machine Labels</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {machines.map(m => <MachineLabel key={m.id} machine={m} />)}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
        }
      `}</style>
    </div>
  )
}
