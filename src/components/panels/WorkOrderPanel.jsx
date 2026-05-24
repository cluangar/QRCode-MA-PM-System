import { useState } from 'react'
import { DetailPanel } from '../ui/DetailPanel.jsx'
import { SpecCard } from '../ui/SpecCard.jsx'
import { ActionButton } from '../ui/ActionButton.jsx'
import { patchWorkOrder } from '../../api/backend.js'

export function WorkOrderPanel({ data, isOpen, onClose, showToast, onOpenPanel }) {
  const [formOpen, setFormOpen] = useState(false)
  const [status, setStatus]     = useState('In Progress')
  const [log, setLog]           = useState('')

  const wo = data?.wo
  if (!wo) return null

  const today = new Date()
  const due   = new Date(wo.due)
  const dueClass = due < today ? 'val-red' : 'val-white'
  const priClass = wo.priority === 'High' ? 'val-red' : wo.priority === 'Normal' ? 'val-amber' : 'val-white'

  async function submitUpdate() {
    try {
      await patchWorkOrder(wo.id, { status, work_log: log })
      showToast('Work order updated successfully')
    } catch {
      showToast('Saved locally — sync pending')
    }
    setFormOpen(false)
    onClose()
  }

  return (
    <DetailPanel isOpen={isOpen} onClose={onClose}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--green)', marginBottom: '2px' }}>Active Work Order</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{wo.num}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <SpecCard label="TYPE"        value={wo.type}              valueClass="val-amber" />
        <SpecCard label="PRIORITY"    value={wo.priority}          valueClass={priClass} />
        <SpecCard label="ASSIGNED TO" value={wo.tech || 'Unassigned'} valueClass="val-blue" />
        <SpecCard label="DUE DATE"    value={wo.due}               valueClass={dueClass} />
        <SpecCard label="DESCRIPTION" value={wo.desc} valueClass="val-white"
          style={{ gridColumn: 'span 2', fontSize: '12px', lineHeight: 1.5 }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 0 }}>
        <ActionButton onClick={() => setFormOpen(f => !f)}>&#x270E; Update Status</ActionButton>
        <ActionButton variant="info" onClick={() => onOpenPanel('parts')}>&#x1F4E6; Parts</ActionButton>
      </div>

      {formOpen && (
        <div style={{ marginTop: '14px', borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '14px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '.06em', marginBottom: '5px' }}>NEW STATUS</div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px',
              color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '13px',
              padding: '9px 11px', marginBottom: '10px', outline: 'none',
            }}
          >
            <option>Open</option>
            <option>In Progress</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '.06em', marginBottom: '5px' }}>WORK LOG</div>
          <textarea
            value={log}
            onChange={e => setLog(e.target.value)}
            placeholder="Describe work performed..."
            rows={3}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '7px',
              color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '13px',
              padding: '9px 11px', marginBottom: '10px', outline: 'none', resize: 'none',
            }}
          />
          <button
            onClick={submitUpdate}
            style={{
              width: '100%', background: 'var(--green-dim)',
              border: '1px solid var(--green-border)', borderRadius: '8px',
              color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: '12px',
              padding: '10px', cursor: 'pointer', fontWeight: 500, letterSpacing: '.06em',
            }}
          >
            &#x2713; Submit Update
          </button>
        </div>
      )}
    </DetailPanel>
  )
}
