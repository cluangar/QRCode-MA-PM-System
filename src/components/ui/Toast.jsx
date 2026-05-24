import { useState, useCallback } from 'react'

export function useToast() {
  const [msg, setMsg]     = useState('')
  const [visible, setVisible] = useState(false)

  const showToast = useCallback((message) => {
    setMsg(message)
    setVisible(true)
    setTimeout(() => setVisible(false), 2800)
  }, [])

  const ToastComponent = (
    <div style={{
      position: 'absolute',
      bottom: '80px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      background: 'rgba(0,255,157,0.12)',
      border: '1px solid var(--green-border)',
      borderRadius: '20px',
      padding: '8px 16px',
      fontFamily: 'var(--mono)',
      fontSize: '12px',
      color: 'var(--green)',
      opacity: visible ? 1 : 0,
      transition: 'opacity .25s, transform .25s',
      whiteSpace: 'nowrap',
      zIndex: 40,
      pointerEvents: 'none',
    }}>
      {msg}
    </div>
  )

  return { showToast, ToastComponent }
}
