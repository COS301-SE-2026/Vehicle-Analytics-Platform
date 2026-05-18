export async function getKPIs() {
    return{
        totalVehicles: 15,
        activeVehicles: 11,
        averageSpeed: 54,
        alertsToday: 2, // need to look into this alert situation -> can we actually return alerts without crashing?
        lastUpdated: new Date().toISOString(),
    }
}

export async function getVehicleLocations(){
    return {
        timestamp : new Date().toISOString,
        vehicles: [
            { id: '1000', lat: -27.98763, lng: 28.37466, speed: 65, status: 'active' },
            { id: '1001', lat: -28.12345, lng: 28.56789, speed: 42, status: 'active' },
            { id: '1002', lat: -27.75432, lng: 28.12345, speed: 0,  status: 'idle' },
            { id: '1003', lat: -28.34521, lng: 28.89012, speed: 78, status: 'active' },
            { id: '1004', lat: -27.65432, lng: 28.45678, speed: 0,  status: 'offline' },
            { id: '1005', lat: -28.56789, lng: 28.23456, speed: 55, status: 'active' },
        ],
    }
}

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

export async function getUsers() {
  // Mock data — remove this block and uncomment the fetch below when ready
  return [
    { id: 1, name: "Zoe Nelly", email: "Zoe@example.com", role: "admin" },
    { id: 2, name: "Bob Smith",    email: "bob@example.com",   role: "user"  },
    { id: 3, name: "Carol White",  email: "carol@example.com", role: "user"  },
  ];
}

