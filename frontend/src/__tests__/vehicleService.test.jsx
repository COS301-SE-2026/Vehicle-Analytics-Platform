const {
  getVehicleLocations,
  getKPIs,
  getAlerts,
  getUsers,
} = require('@/services/vehicleService.jsx')

describe('getVehicleLocations', () => {
  it('returns a valid ISO timestamp string', async () => {
    const result = await getVehicleLocations()
    expect(typeof result.timestamp).toBe('string')
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('returns a non-empty vehicles array', async () => {
    const { vehicles } = await getVehicleLocations()
    expect(Array.isArray(vehicles)).toBe(true)
    expect(vehicles.length).toBeGreaterThan(0)
  })

  it('every vehicle has required fields', async () => {
    const { vehicles } = await getVehicleLocations()
    vehicles.forEach(v => {
      expect(v).toHaveProperty('id')
      expect(v).toHaveProperty('lat')
      expect(v).toHaveProperty('lng')
      expect(v).toHaveProperty('speed')
      expect(v).toHaveProperty('status')
    })
  })

  it('vehicle status is one of active | idle | offline', async () => {
    const { vehicles } = await getVehicleLocations()
    const valid = new Set(['active', 'idle', 'offline'])
    vehicles.forEach(v => expect(valid.has(v.status)).toBe(true))
  })

  it('vehicle lat/lng are finite numbers', async () => {
    const { vehicles } = await getVehicleLocations()
    vehicles.forEach(v => {
      expect(Number.isFinite(v.lat)).toBe(true)
      expect(Number.isFinite(v.lng)).toBe(true)
    })
  })

  it('vehicle speed is a non-negative number', async () => {
    const { vehicles } = await getVehicleLocations()
    vehicles.forEach(v => {
      expect(typeof v.speed).toBe('number')
      expect(v.speed).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('getKPIs', () => {
  it('returns all expected KPI keys', async () => {
    const kpis = await getKPIs()
    expect(kpis).toHaveProperty('totalVehicles')
    expect(kpis).toHaveProperty('activeVehicles')
    expect(kpis).toHaveProperty('averageSpeed')
    expect(kpis).toHaveProperty('alertsToday')
    expect(kpis).toHaveProperty('lastUpdated')
  })

  it('activeVehicles does not exceed totalVehicles', async () => {
    const { totalVehicles, activeVehicles } = await getKPIs()
    expect(activeVehicles).toBeLessThanOrEqual(totalVehicles)
  })

  it('lastUpdated is a valid ISO string', async () => {
    const { lastUpdated } = await getKPIs()
    expect(new Date(lastUpdated).toString()).not.toBe('Invalid Date')
  })

  it('averageSpeed is a non-negative number', async () => {
    const { averageSpeed } = await getKPIs()
    expect(averageSpeed).toBeGreaterThanOrEqual(0)
  })
})

describe('getAlerts', () => {
  it('returns a numeric total', async () => {
    const result = await getAlerts()
    expect(typeof result.total).toBe('number')
  })

  it('alerts array length matches total', async () => {
    const { total, alerts } = await getAlerts()
    expect(alerts).toHaveLength(total)
  })

  it('each alert has required fields', async () => {
    const { alerts } = await getAlerts()
    alerts.forEach(a => {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('vehicleId')
      expect(a).toHaveProperty('type')
      expect(a).toHaveProperty('severity')
      expect(a).toHaveProperty('message')
      expect(a).toHaveProperty('timestamp')
    })
  })

  it('severity is one of high | medium | low', async () => {
    const { alerts } = await getAlerts()
    const valid = new Set(['high', 'medium', 'low'])
    alerts.forEach(a => expect(valid.has(a.severity)).toBe(true))
  })

  it('timestamps are valid dates in the past', async () => {
    const { alerts } = await getAlerts()
    const now = Date.now()
    alerts.forEach(a => {
      const ts = new Date(a.timestamp).getTime()
      expect(ts).toBeLessThanOrEqual(now)
    })
  })
})

describe('getUsers', () => {
  it('returns a non-empty array of users', async () => {
    const users = await getUsers()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
  })

  it('each user has id, name, email, and role', async () => {
    const users = await getUsers()
    users.forEach(u => {
      expect(u).toHaveProperty('id')
      expect(u).toHaveProperty('name')
      expect(u).toHaveProperty('email')
      expect(u).toHaveProperty('role')
    })
  })

  it('role is one of admin | manager | viewer', async () => {
    const users = await getUsers()
    const valid = new Set(['admin', 'manager', 'viewer'])
    users.forEach(u => expect(valid.has(u.role)).toBe(true))
  })

  it('emails follow a basic format', async () => {
    const users = await getUsers()
    users.forEach(u => {
      expect(u.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })
  })
})