import { useState, useEffect } from 'react'

export function HUDBar({ machineId, machineName }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      background: 'linear-gradient(180deg, rgba(6,10,15,0.9) 0%, transparent 100%)',
      pointerEvents: 'all',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '7px', height: '7px',
          borderRadius: '50%',
          background: 'var(--red)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }} />
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '.12em' }}>
            AR LIVE · MA/PM OVERLAY
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--green)', letterSpacing: '.06em' }}>
            {machineId && machineName ? `${machineId} · ${machineName}` : '—'}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
        {time}
      </div>
    </div>
  )
}
