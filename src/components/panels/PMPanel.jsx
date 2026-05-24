import { DetailPanel } from '../ui/DetailPanel.jsx'
import { SpecCard } from '../ui/SpecCard.jsx'
import { ActionButton } from '../ui/ActionButton.jsx'
import { patchPM } from '../../api/backend.js'

export function PMPanel({ data, isOpen, onClose, showToast }) {
  const pm = data?.pm
  if (!pm) return null
  const overdue = pm.status === 'overdue'

  async function logPMDone() {
    const today = new Date().toISOString().split('T')[0]
    try {
      await patchPM(pm.id, { last_pm_date: today, status: 'Completed' })
      showToast('PM logged as completed')
    } catch {
      showToast('PM completed — ' + today)
    }
    onClose()
  }

  return (
    <DetailPanel isOpen={isOpen} onClose={onClose}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--green)', marginBottom: '2px' }}>PM Schedule</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{data?.machine?.name}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <SpecCard label="FREQUENCY" value={pm.freq}  valueClass="val-blue" />
        <SpecCard label="LAST PM"   value={pm.last}  valueClass="val-white" />
        <SpecCard label="NEXT DUE"  value={pm.next}  valueClass={overdue ? 'val-red' : 'val-green'} />
        <SpecCard label="PM STATUS" value={overdue ? 'OVERDUE' : 'On Schedule'} valueClass={overdue ? 'val-red' : 'val-green'} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '8px', padding: '9px 11px', marginBottom: '14px',
      }}>
        <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '.08em', marginBottom: '6px' }}>
          PM TASKS CHECKLIST
        </div>
        {(pm.tasks || []).map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', padding: '2px 0' }}>
            <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>&#x25A1;</span>
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <ActionButton onClick={logPMDone}>&#x2713; Log PM Completed</ActionButton>
      </div>
    </DetailPanel>
  )
}
