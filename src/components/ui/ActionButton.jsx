export function ActionButton({ children, variant, onClick, style }) {
  const variants = {
    default: {
      background: 'var(--green-dim)',
      border: '1px solid var(--green-border)',
      color: 'var(--green)',
    },
    danger: {
      background: 'var(--red-dim)',
      border: '1px solid rgba(255,68,68,0.35)',
      color: 'var(--red)',
    },
    info: {
      background: 'var(--blue-dim)',
      border: '1px solid rgba(56,189,248,0.3)',
      color: 'var(--blue)',
    },
  }
  const v = variants[variant] || variants.default

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: '90px',
        borderRadius: '10px',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        padding: '9px 10px',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        transition: 'background .15s',
        ...v,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
