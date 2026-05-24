const BASE = '/api'

export async function fetchMachineData(machineId) {
  const res = await fetch(`${BASE}/machine/${machineId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function patchWorkOrder(id, data) {
  const res = await fetch(`${BASE}/workorder/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function patchPM(id, data) {
  const res = await fetch(`${BASE}/pm/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function createWorkOrder(machineId, description = 'Alert raised via AR overlay') {
  const res = await fetch(`${BASE}/workorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machine_id: machineId, type: 'Corrective', priority: 'High', description }),
  })
  return res.json()
}

export async function testBackend() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
