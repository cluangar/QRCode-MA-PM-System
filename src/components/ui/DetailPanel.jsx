export function DetailPanel({ isOpen, onClose, children }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      background: 'var(--panel)',
      borderTop: '1px solid var(--border)',
      borderRadius: '16px 16px 0 0',
      padding: '0 0 env(safe-area-inset-bottom, 16px)',
      pointerEvents: 'all',
      zIndex: 20,
      transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
      maxHeight: '72vh',
      overflowY: 'auto',
    }}>
      <div style={{ width: '36px', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '12px auto 0' }} />
      <div style={{ padding: '14px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            {children[0]}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '18px',
              width: '28px', height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              marginLeft: '10px',
            }}
          >
            &#x2715;
          </button>
        </div>
        {children.slice(1)}
      </div>
    </div>
  )
}
