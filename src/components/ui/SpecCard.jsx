export function SpecCard({ label, value, valueClass, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '9px 11px',
      ...style,
    }}>
      <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '.08em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500 }} className={valueClass}>
        {value || '—'}
      </div>
    </div>
  )
}
