import { HUDBar } from './HUDBar.jsx'
import { ZoneButton } from './ZoneButton.jsx'

const STATUS_DOT = {
  Running:     'green',
  Fault:       'red',
  Idle:        'amber',
  Maintenance: 'blue',
}

export function AROverlay({ machineData, onZoneClick }) {
  const machine = machineData?.machine
  const dotColor = STATUS_DOT[machine?.status] || 'amber'

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {/* connector lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
           viewBox="0 0 100 100" preserveAspectRatio="none">
        <line stroke="rgba(0,255,157,0.3)"  strokeWidth="0.3" strokeDasharray="2 2" x1="10" y1="20" x2="25" y2="50" />
        <line stroke="rgba(255,176,32,0.3)" strokeWidth="0.3" strokeDasharray="2 2" x1="90" y1="30" x2="75" y2="50" />
        <line stroke="rgba(56,189,248,0.3)" strokeWidth="0.3" strokeDasharray="2 2" x1="10" y1="52" x2="25" y2="50" />
        <line stroke="rgba(0,255,157,0.3)"  strokeWidth="0.3" strokeDasharray="2 2" x1="90" y1="68" x2="75" y2="60" />
      </svg>

      <HUDBar machineId={machine?.id} machineName={machine?.name} />

      {/* corner brackets */}
      <div style={{ position: 'absolute', top: '44px', left: '10px', width: '20px', height: '20px', borderTop: '1.5px solid var(--green)', borderLeft: '1.5px solid var(--green)', opacity: 0.6 }} />
      <div style={{ position: 'absolute', top: '44px', right: '10px', width: '20px', height: '20px', borderTop: '1.5px solid var(--green)', borderRight: '1.5px solid var(--green)', opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: 0, left: '10px', width: '20px', height: '20px', borderBottom: '1.5px solid var(--green)', borderLeft: '1.5px solid var(--green)', opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: 0, right: '10px', width: '20px', height: '20px', borderBottom: '1.5px solid var(--green)', borderRight: '1.5px solid var(--green)', opacity: 0.6 }} />

      <ZoneButton label={machine?.status || 'Status'} dotColor={dotColor} style={{ top: '14%', left: '3%' }} onClick={() => onZoneClick('status')} />
      <ZoneButton label="Work Order"  dotColor="amber" style={{ top: '28%', right: '3%' }} onClick={() => onZoneClick('wo')} />
      <ZoneButton label="PM Schedule" dotColor="blue"  style={{ top: '50%', left: '3%' }} onClick={() => onZoneClick('pm')} />
      <ZoneButton label="Spare Parts" dotColor="green" style={{ top: '68%', right: '3%' }} onClick={() => onZoneClick('parts')} />
      <ZoneButton label="Runtime"     dotColor="blue"  style={{ top: '84%', left: '3%' }} onClick={() => onZoneClick('runtime')} />
    </div>
  )
}
