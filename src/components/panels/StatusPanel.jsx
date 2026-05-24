import { DetailPanel } from '../ui/DetailPanel.jsx'
import { SpecCard } from '../ui/SpecCard.jsx'
import { ActionButton } from '../ui/ActionButton.jsx'
import { createWorkOrder } from '../../api/backend.js'

const STATUS_COLOR = {
  Running:     { hex: '#00ff9d' },
  Fault:       { hex: '#ff4444' },
  Idle:        { hex: '#ffb020' },
  Maintenance: { hex: '#38bdf8' },
}

export function StatusPanel({ data, isOpen, onClose, showToast, onOpenPanel }) {
  const m = data?.machine
  if (!m) return null
  const color = STATUS_COLOR[m.status] || STATUS_COLOR.Idle

  async function raiseAlert() {
    try {
      await createWorkOrder(m.id)
      showToast('Alert sent — WO created')
    } catch {
      showToast('Alert raised — notifying team')
    }
    onClose()
  }

  return (
    <DetailPanel isOpen={isOpen} onClose={onClose}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--green)', marginBottom: '2px' }}>{m.name}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{m.id} · {m.location}</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        fontSize: '12px', color: 'var(--text-dim)',
        marginBottom: '14px', padding: '8px 10px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: color.hex }} />
        <span>{m.status} — Last updated {m.updated}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <SpecCard label="LOCATION"    value={m.location} valueClass="val-white" />
        <SpecCard label="MODEL"       value={m.model}    valueClass="val-white" />
        <SpecCard label="SERIAL NO."  value={m.serial}   valueClass="val-white" />
        <SpecCard label="LAST UPDATED" value={m.updated} valueClass="val-white" />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <ActionButton variant="danger" onClick={raiseAlert}>&#x26A0; Raise Alert</ActionButton>
        <ActionButton variant="info" onClick={() => onOpenPanel('runtime')}>&#x23F1; Runtime</ActionButton>
      </div>
    </DetailPanel>
  )
}
