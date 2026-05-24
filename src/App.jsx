import { useState, useEffect } from 'react'
import { useCamera } from './hooks/useCamera.js'
import { useQRScanner } from './hooks/useQRScanner.js'
import { useMachineData } from './hooks/useMachineData.js'
import { useToast } from './components/ui/Toast.jsx'
import { LandingScreen } from './screens/LandingScreen.jsx'
import { LoadingScreen } from './screens/LoadingScreen.jsx'
import { PrintQRScreen } from './screens/PrintQRScreen.jsx'
import { MachinesScreen } from './screens/MachinesScreen.jsx'
import { ReportsScreen } from './screens/ReportsScreen.jsx'
import { AdminScreen } from './screens/AdminScreen.jsx'
import { AdminGate } from './components/AdminGate.jsx'
import { AROverlay } from './components/AROverlay.jsx'
import { StatusPanel } from './components/panels/StatusPanel.jsx'
import { WorkOrderPanel } from './components/panels/WorkOrderPanel.jsx'
import { PMPanel } from './components/panels/PMPanel.jsx'
import { PartsPanel } from './components/panels/PartsPanel.jsx'
import { RuntimePanel } from './components/panels/RuntimePanel.jsx'
import { testBackend } from './api/backend.js'
import { DEMO } from './data/demoData.js'

export default function App() {
  if (new URLSearchParams(location.search).has('admin'))    return <AdminGate><AdminScreen /></AdminGate>
  if (new URLSearchParams(location.search).has('print'))    return <AdminGate><PrintQRScreen /></AdminGate>
  if (new URLSearchParams(location.search).has('machines')) return <AdminGate><MachinesScreen /></AdminGate>
  if (new URLSearchParams(location.search).has('reports'))  return <AdminGate><ReportsScreen /></AdminGate>

  const [screen, setScreen]           = useState('landing')
  const [machineId, setMachineId]     = useState(null)
  const [demoData, setDemoData]       = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [loadMsg, setLoadMsg]         = useState('')
  const [menuOpen, setMenuOpen]       = useState(false)
  const [serverOk, setServerOk]       = useState(null)
  const [scanning, setScanning]       = useState(false)

  const { videoRef, startCamera, cameraActive, error: camError } = useCamera()
  const { data: liveData, loading } = useMachineData(demoData ? null : machineId)
  const data = demoData || liveData
  const { showToast, ToastComponent } = useToast()

  useQRScanner(videoRef, handleQRResult, scanning)

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('machine')
    if (id) handleLoadMachine(id)
  }, [])

  useEffect(() => {
    if (camError) {
      showToast('Camera unavailable — using demo mode')
      handleLoadMachine('MCH-001')
    }
  }, [camError])

  useEffect(() => {
    if (screen === 'loading' && data) setScreen('ar')
  }, [data, screen])

  async function handleStartCamera() {
    setLoadMsg('Starting camera...')
    setScreen('loading')
    await startCamera()
    setScanning(true)
    setLoadMsg('Point camera at machine QR code...')
  }

  function handleQRResult(raw) {
    setScanning(false)
    let id = raw
    try {
      const url = new URL(raw)
      id = url.searchParams.get('id') || url.searchParams.get('machine') || raw
    } catch {}
    showToast(`QR detected: ${id}`)
    handleLoadMachine(id)
  }

  function handleSkipQR() {
    setScanning(false)
    handleLoadMachine('MCH-001')
  }

  function handleLoadMachine(id) {
    setDemoData(null)
    setMachineId(id)
    setLoadMsg(`Loading machine data... (${id})`)
    setScreen('loading')
  }

  async function handleLoadDemo(id) {
    setDemoData(null)
    setLoadMsg('Loading demo...')
    setScreen('loading')
    await new Promise(r => setTimeout(r, 600))
    setDemoData(DEMO[id] || DEMO['MCH-001'])
    setMachineId(id)
  }

  function openPanel(name) {
    if (name === 'wo' && !data?.wo) { showToast('No active work order'); return }
    if (name === 'pm' && !data?.pm) { showToast('No PM schedule found'); return }
    setActivePanel(name)
  }

  function closePanel() { setActivePanel(null) }

  async function handleOpenMenu() {
    setMenuOpen(o => !o)
    setServerOk(null)
    try {
      await testBackend()
      setServerOk(true)
    } catch {
      setServerOk(false)
    }
  }

  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>

      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75,
          display: screen === 'ar' && cameraActive ? 'block' : 'none',
          zIndex: 1,
        }}
      />

      {screen === 'landing' && (
        <LandingScreen onStartCamera={handleStartCamera} onLoadDemo={handleLoadDemo} />
      )}

      {screen === 'loading' && (
        <LoadingScreen
          msg={loadMsg}
          sub={scanning ? 'Aim at QR label on the machine' : loading ? 'Fetching data...' : ''}
          onSkip={scanning ? handleSkipQR : null}
        />
      )}

      {screen === 'ar' && (
        <>
          {!cameraActive && (
            <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 1 }}>
              <div style={{
                width: '100%', height: '100%',
                background: `repeating-linear-gradient(0deg, rgba(0,255,157,0.03) 0px, transparent 1px, transparent 40px),
                             repeating-linear-gradient(90deg, rgba(0,255,157,0.03) 0px, transparent 1px, transparent 40px),
                             #060a0f`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 'min(340px, 90vw)', height: 'min(420px, 60vh)',
                  border: '1px solid rgba(0,255,157,0.15)', borderRadius: '8px',
                  background: 'rgba(0,255,157,0.03)',
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="180" height="240" viewBox="0 0 180 240" fill="none" opacity="0.3">
                    <rect x="20" y="20" width="140" height="180" rx="8" stroke="#00ff9d" strokeWidth="1.5"/>
                    <rect x="40" y="40" width="100" height="60" rx="4" stroke="#00ff9d" strokeWidth="1"/>
                    <rect x="50" y="50" width="80" height="40" rx="2" fill="rgba(0,255,157,0.08)"/>
                    <circle cx="90" cy="150" r="30" stroke="#00ff9d" strokeWidth="1.5"/>
                    <circle cx="90" cy="150" r="18" stroke="#00ff9d" strokeWidth="1" strokeDasharray="4 4"/>
                    <circle cx="90" cy="150" r="6" fill="rgba(0,255,157,0.3)"/>
                    <rect x="30" y="210" width="120" height="8" rx="2" stroke="#00ff9d" strokeWidth="1"/>
                  </svg>
                  <div style={{
                    position: 'absolute', left: 0, right: 0, height: '1px',
                    background: 'linear-gradient(90deg, transparent, var(--green), transparent)',
                    animation: 'scanline 4s linear infinite',
                    pointerEvents: 'none',
                  }} />
                </div>
              </div>
            </div>
          )}

          <AROverlay machineData={data} onZoneClick={openPanel} />

          {/* Menu button */}
          <button
            onClick={handleOpenMenu}
            style={{
              position: 'absolute', top: '10px', right: '14px',
              background: 'none', border: 'none', color: 'var(--text-dim)',
              fontSize: '20px', cursor: 'pointer', zIndex: 35, pointerEvents: 'all', padding: '4px',
            }}
          >
            &#x2699;
          </button>

          {/* Menu panel */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '44px', right: '10px', width: '220px',
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '14px', zIndex: 40,
              pointerEvents: 'all', backdropFilter: 'blur(12px)',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '.1em', marginBottom: '12px' }}>
                MA/PM AR INSPECTOR
              </div>

              {/* Server status */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                fontSize: '11px', color: 'var(--text-dim)',
                marginBottom: '12px', padding: '7px 9px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '7px',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: serverOk === null ? '#888' : serverOk ? '#00ff9d' : '#ff4757',
                }} />
                <span>
                  {serverOk === null ? 'Checking server...' : serverOk ? 'API server online' : 'API offline — demo mode'}
                </span>
              </div>

              {/* Actions */}
              {[
                { label: '&#x1F4CB; Admin Dashboard',   href: '/?admin' },
                { label: '&#x2699; Manage Machines',    href: '/?machines' },
                { label: '&#x1F4CA; Reports / Export',  href: '/?reports' },
                { label: '&#x1F5A8; Print QR Labels',   href: '/?print' },
              ].map(({ label, href }) => (
                <a key={href} href={href}
                  style={{
                    display: 'block', padding: '9px 10px', marginBottom: '6px',
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: '7px', color: 'var(--text)', fontFamily: 'var(--mono)',
                    fontSize: '12px', textDecoration: 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: label }}
                />
              ))}
              <button
                onClick={() => { setMenuOpen(false); setScreen('landing'); setMachineId(null); setDemoData(null) }}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '7px',
                  color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '12px',
                  padding: '9px 10px', cursor: 'pointer', textAlign: 'left',
                }}
              >
                &#x1F4F7; Scan New Machine
              </button>
            </div>
          )}

          <StatusPanel   data={data} isOpen={activePanel === 'status'}  onClose={closePanel} showToast={showToast} onOpenPanel={openPanel} />
          <WorkOrderPanel data={data} isOpen={activePanel === 'wo'}     onClose={closePanel} showToast={showToast} onOpenPanel={openPanel} />
          <PMPanel       data={data} isOpen={activePanel === 'pm'}      onClose={closePanel} showToast={showToast} />
          <PartsPanel    data={data} isOpen={activePanel === 'parts'}   onClose={closePanel} showToast={showToast} onOpenPanel={openPanel} />
          <RuntimePanel  data={data} isOpen={activePanel === 'runtime'} onClose={closePanel} />

          {ToastComponent}

          {(activePanel || menuOpen) && (
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 15 }}
              onClick={() => { setActivePanel(null); setMenuOpen(false) }}
            />
          )}
        </>
      )}
    </div>
  )
}
