const dotColors = {
  green: { background: 'var(--green)', boxShadow: '0 0 5px var(--green)' },
  amber: { background: 'var(--amber)', boxShadow: '0 0 5px var(--amber)' },
  red:   { background: 'var(--red)',   boxShadow: '0 0 5px var(--red)' },
  blue:  { background: 'var(--blue)',  boxShadow: '0 0 5px var(--blue)' },
}

export function ZoneButton({ label, dotColor, style, onClick }) {
  const dot = dotColors[dotColor] || dotColors.green

  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        pointerEvents: 'all',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(6,14,22,0.82)',
        border: '1px solid var(--green-border)',
        borderRadius: '20px',
        padding: '5px 10px 5px 7px',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        color: 'var(--green)',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(8px)',
        transition: 'background .15s, border-color .15s',
        ...style,
      }}
    >
      <div style={{
        width: '7px', height: '7px',
        borderRadius: '50%',
        flexShrink: 0,
        animation: 'pulse 2s infinite',
        ...dot,
      }} />
      {label}
    </button>
  )
}
