// API suggestion: GET /api/kpis
// Response shape: { totalVehicles, activeVehicles, averageSpeed, alertsToday, lastUpdated }
//replacing the mock data with that of actual api calls
export async function getKPIs(){
    const response = await fetch(`${API_BASE}/dashboard/kpis`, {
        headers: { 'Content-Type' : 'application/json',},
    })
    if(!response.ok){
        throw new Error('Failed to fetch KPIs')
    }

    const result = await response.json()
    return {
        totalVehicles : result.data.total_vehicles,
        activeVehicles: result.data.active_vehicles,
        averageSpeed: result.data.average_speed,
        alertsToday: result.data.alerts_today,
        lastUpdated: result.data.last_updated,
    }
}

// API suggestion: GET /api/vehicles/locations or GET /api/telemetry/latest
// Response shape: { timestamp, vehicles: [{ id, lat, lng, speed, status, lastUpdated?, distanceToday? }, ...] }
export async function getVehicleLocations(){
    return {
        timestamp : new Date().toISOString(),
        vehicles: [ // this is the mock data
            { id: '1000', lat: -27.98763, lng: 28.37466, speed: 65, status: 'active', distanceToday: 300 },
            { id: '1001', lat: -28.12345, lng: 28.56789, speed: 42, status: 'active', distanceToday: 249 },
            { id: '1002', lat: -27.75432, lng: 28.12345, speed: 0,  status: 'idle' , distanceToday: 129},
            { id: '1003', lat: -28.34521, lng: 28.89012, speed: 78, status: 'active' , distanceToday: 288},
            { id: '1004', lat: -27.65432, lng: 28.45678, speed: 0,  status: 'offline', distanceToday: 5 },
            { id: '1005', lat: -28.56789, lng: 28.23456, speed: 55, status: 'active' , distanceToday: 240},
        ],
    }
}

// API suggestion: GET /api/alerts?since=...&limit=...
// Response shape: { total, alerts: [{ id, vehicleId, type, severity, message, timestamp }, ...] }
export async function getAlerts() {
    return {
        total: 2,
        alerts: [
            {
              id: 'alert_001',
              vehicleId: '1000',
              type: 'speeding',
              severity: 'high',
              message: 'Vehicle exceeded speed limit: 95 km/h in 80 zone',
              timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            },
            {
              id: 'alert_002',
              vehicleId: '1003',
              type: 'speeding',
              severity: 'medium',
              message: 'Vehicle exceeded speed limit: 85 km/h in 80 zone',
              timestamp: new Date(Date.now() - 111 * 60000).toISOString(),
            },
        ],
    }
}

// API suggestion: GET /api/users
// Other user endpoints: POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
// Response: array of users [{ id, name, email, role, status? }, ...]
export async function getUsers() {
  // Mock data — remove this block and uncomment the fetch below when ready
  return [
    { id: 1, name: "Zoe Nelly", email: "zoe.nelly@fleet.local", role: "admin" },
    { id: 2, name: "Bob Smith", email: "bob.smith@fleet.local", role: "fleet_manager" },
    { id: 3, name: "Carol White", email: "carol.white@fleet.local", role: "viewer" },
  ];
}

