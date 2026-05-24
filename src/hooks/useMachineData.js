import { useState, useEffect, useCallback } from 'react'
import { fetchMachineData } from '../api/backend.js'
import { DEMO } from '../data/demoData.js'

export function useMachineData(machineId) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!machineId) return
    setLoading(true)
    setError(null)
    let result = null

    try {
      result = await fetchMachineData(machineId)
    } catch (e) {
      console.warn('API fetch failed, using demo data:', e)
    }

    if (!result) {
      await new Promise(r => setTimeout(r, 400))
      result = DEMO[machineId] || DEMO['MCH-001']
    }

    setData(result)
    setLoading(false)
  }, [machineId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!machineId) return
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [machineId, load])

  return { data, loading, error, refresh: load }
}
