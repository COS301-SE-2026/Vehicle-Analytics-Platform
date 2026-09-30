import { useCallback, useEffect, useRef, useState } from 'react'
import { getVehicleLocations, getVehiclePositionBuffer } from '@/services/vehicleService'

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

/**
 * Polls live vehicle positions and the recent-position buffer used for
 * smooth marker movement. Each poll waits for the previous one to finish,
 * so a slow API never stacks up requests.
 */
export default function useLiveFleetData({ locationsMs = 2000, bufferMs = 10000 } = {}) {
  const [vehicles, setVehicles] = useState([])
  const [buffer, setBuffer] = useState(EMPTY_FC)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const cancelled = useRef(false)

  const fetchLocations = useCallback(async () => {
    try {
      const result = await getVehicleLocations()
      if (cancelled.current) return
      setVehicles(result?.vehicles ?? [])
      setLastUpdated(new Date())
    } catch (err) {
      console.warn('Live map: failed to load vehicle locations', err)
    } finally {
      if (!cancelled.current) setLoading(false)
    }
  }, [])

  const fetchBuffer = useCallback(async () => {
    try {
      const data = await getVehiclePositionBuffer()
      if (!cancelled.current && data) setBuffer(data)
    } catch (err) {
      console.warn('Live map: failed to load position buffer', err)
    }
  }, [])

  useEffect(() => {
    cancelled.current = false
    const timers = []

    function schedule(fetcher, ms) {
      async function poll() {
        await fetcher()
        if (!cancelled.current) timers.push(setTimeout(poll, ms))
      }
      poll()
    }

    schedule(fetchLocations, locationsMs)
    schedule(fetchBuffer, bufferMs)

    return () => {
      cancelled.current = true
      timers.forEach(clearTimeout)
    }
  }, [fetchLocations, fetchBuffer, locationsMs, bufferMs])

  return { vehicles, buffer, loading, lastUpdated }
}
