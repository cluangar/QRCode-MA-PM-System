export function LoadingScreen({ msg, sub, onSkip }) {
  const isScanning = !!onSkip

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      zIndex: 30, background: 'var(--bg)', padding: '24px', textAlign: 'center',
    }}>
      {isScanning ? (
        /* QR scan frame */
        <div style={{
          width: '160px', height: '160px',
          border: '2px solid var(--green)', borderRadius: '10px',
          position: 'relative', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {[
            { top: '-2px', left: '-2px',   borderWidth: '3px 0 0 3px', borderRadius: '4px 0 0 0' },
            { top: '-2px', right: '-2px',  borderWidth: '3px 3px 0 0', borderRadius: '0 4px 0 0' },
            { bottom: '-2px', left: '-2px',  borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 4px' },
            { bottom: '-2px', right: '-2px', borderWidth: '0 3px 3px 0', borderRadius: '0 0 4px 0' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: '20px', height: '20px', borderColor: 'var(--green)', borderStyle: 'solid', ...s }} />
          ))}
          <div style={{
            position: 'absolute', left: '6px', right: '6px', height: '2px',
            background: 'var(--green)', opacity: 0.8,
            animation: 'qrscan 1.5s ease-in-out infinite',
          }} />
          <svg width="60" height="60" viewBox="0 0 80 80" fill="none" opacity=".2">
            <rect x="8"  y="8"  width="26" height="26" rx="3" stroke="#00ff9d" strokeWidth="2"/>
            <rect x="14" y="14" width="14" height="14" rx="1" fill="#00ff9d"/>
            <rect x="46" y="8"  width="26" height="26" rx="3" stroke="#00ff9d" strokeWidth="2"/>
            <rect x="52" y="14" width="14" height="14" rx="1" fill="#00ff9d"/>
            <rect x="8"  y="46" width="26" height="26" rx="3" stroke="#00ff9d" strokeWidth="2"/>
            <rect x="14" y="52" width="14" height="14" rx="1" fill="#00ff9d"/>
            <rect x="46" y="46" width="8"  height="8"  rx="1" fill="#00ff9d"/>
            <rect x="58" y="46" width="8"  height="8"  rx="1" fill="#00ff9d"/>
            <rect x="46" y="58" width="8"  height="8"  rx="1" fill="#00ff9d"/>
            <rect x="58" y="58" width="8"  height="8"  rx="1" fill="#00ff9d"/>
          </svg>
        </div>
      ) : (
        <div style={{
          width: '36px', height: '36px',
          border: '2px solid rgba(0,255,157,0.2)',
          borderTopColor: 'var(--green)',
          borderRadius: '50%',
          animation: 'spin .8s linear infinite',
          margin: '0 auto 16px',
        }} />
      )}

      <div style={{ fontSize: '14px', fontWeight: 500 }}>{msg || 'Loading...'}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>{sub}</div>}

      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            marginTop: '24px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
            color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '11px',
            padding: '9px 20px', cursor: 'pointer',
          }}
        >
          Skip — Load Demo
        </button>
      )}
    </div>
  )
}
