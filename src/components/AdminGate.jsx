import { useState } from 'react'

const KEY = 'mapm_admin_ok'

export function isAdminAuthed() {
  return sessionStorage.getItem(KEY) === '1'
}

export function AdminGate({ children }) {
  const [authed, setAuthed] = useState(isAdminAuthed)
  const [user,   setUser]   = useState('')
  const [pass,   setPass]   = useState('')
  const [err,    setErr]    = useState('')
  const [peek,   setPeek]   = useState(false)
  const [busy,   setBusy]   = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.trim(), pass }),
      })
      const data = await r.json()
      if (r.ok && data.ok) {
        sessionStorage.setItem(KEY, '1')
        setAuthed(true)
      } else {
        setErr(data.error || 'Invalid username or password')
        setPass('')
      }
    } catch {
      setErr('Cannot connect to server — is it running?')
    } finally {
      setBusy(false)
    }
  }

  if (authed) return children

  return (
    <div style={{
      minHeight: '100vh', background: '#060a0f',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Sans Thai, sans-serif', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '340px' }}>

        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 14px',
            background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
          }}>
            &#x1F512;
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#00ff9d', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.05em' }}>
            ADMIN LOGIN
          </div>
          <div style={{ fontSize: '11px', color: '#4a5568', fontFamily: 'IBM Plex Mono, monospace', marginTop: '4px', letterSpacing: '.1em' }}>
            MA/PM AR INSPECTOR
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', color: '#4a5568', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.1em', display: 'block', marginBottom: '5px' }}>
              USERNAME
            </label>
            <input
              value={user} onChange={e => { setUser(e.target.value); setErr('') }}
              autoComplete="username" autoFocus disabled={busy}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                color: '#c8d6e5', fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px',
                padding: '11px 13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '10px', color: '#4a5568', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.1em', display: 'block', marginBottom: '5px' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={peek ? 'text' : 'password'}
                value={pass} onChange={e => { setPass(e.target.value); setErr('') }}
                autoComplete="current-password" disabled={busy}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                  color: '#c8d6e5', fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px',
                  padding: '11px 40px 11px 13px', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setPeek(p => !p)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '14px', padding: '4px',
                }}>
                {peek ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {err && (
            <div style={{ color: '#ff4757', fontSize: '12px', marginBottom: '12px', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center' }}>
              ✕ {err}
            </div>
          )}

          <button type="submit" disabled={busy} style={{
            width: '100%', background: 'rgba(0,255,157,0.12)',
            border: '1px solid rgba(0,255,157,0.3)', borderRadius: '8px',
            color: '#00ff9d', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px',
            padding: '12px', cursor: busy ? 'wait' : 'pointer', fontWeight: 600, letterSpacing: '.06em',
            opacity: busy ? 0.6 : 1,
          }}>
            {busy ? 'Checking…' : '🔑 Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/" style={{ fontSize: '11px', color: '#4a5568', fontFamily: 'IBM Plex Mono, monospace', textDecoration: 'none' }}>
            ← Back to AR App
          </a>
        </div>
      </div>
    </div>
  )
}
