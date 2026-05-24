import { DetailPanel } from '../ui/DetailPanel.jsx'
import { ActionButton } from '../ui/ActionButton.jsx'

export function PartsPanel({ data, isOpen, onClose, showToast, onOpenPanel }) {
  const parts = data?.parts || []

  return (
    <DetailPanel isOpen={isOpen} onClose={onClose}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--green)', marginBottom: '2px' }}>Spare Parts</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
          {data?.machine?.name || 'linked to this machine'}
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        {parts.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
            No parts linked to this machine
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {parts.map(p => {
              const low = p.qty <= p.reorder
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '9px 11px',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginTop: '2px' }}>{p.id}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: low ? 'var(--red)' : 'var(--green)' }}>
                      {p.qty} {p.unit}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>reorder @ {p.reorder}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <ActionButton variant="danger" onClick={() => showToast('Request sent to admin')}>&#x2B07; Request Reorder</ActionButton>
        <ActionButton onClick={() => onOpenPanel('wo')}>&#x1F527; Issue to WO</ActionButton>
      </div>
    </DetailPanel>
  )
}
