import { DetailPanel } from '../ui/DetailPanel.jsx'
import { SpecCard } from '../ui/SpecCard.jsx'

const DAYS = ['M','T','W','T','F','S','S']

export function RuntimePanel({ data, isOpen, onClose }) {
  const rt = data?.runtime
  if (!rt) return null

  const trend = rt.trend || []
  const max   = Math.max(...trend, 1)

  return (
    <DetailPanel isOpen={isOpen} onClose={onClose}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--green)', marginBottom: '2px' }}>Runtime Hours</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>from Home Assistant sensor</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        <SpecCard label="TOTAL RUNTIME"    value={rt.total}   valueClass="val-green" />
        <SpecCard label="NEXT PM TRIGGER"  value={rt.trigger} valueClass="val-amber" />
        <SpecCard label="TODAY"            value={rt.today}   valueClass="val-white" />
        <SpecCard label="THIS MONTH"       value={rt.month}   valueClass="val-white" />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '8px', padding: '9px 11px',
      }}>
        <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '.08em', marginBottom: '8px' }}>
          RUNTIME TREND (last 7 days hrs/day)
        </div>
        <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
          {trend.map((v, i) => {
            const pct = Math.round((v / max) * 100)
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{
                  width: '100%',
                  height: `${pct}%`,
                  background: 'var(--green)',
                  opacity: 0.7,
                  borderRadius: '2px 2px 0 0',
                  minHeight: '2px',
                }} />
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{DAYS[i]}</div>
              </div>
            )
          })}
        </div>
      </div>
    </DetailPanel>
  )
}
