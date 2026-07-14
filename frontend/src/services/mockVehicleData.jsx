const mockVehicles = [
    {id: 'TRK-2024-X1', status: 'moving', zone: 'Pretoria Depot', hasAlert: false, safetyScore: 92, lastUpdated: '14:22:05', stale: false},
    {id: 'VAN-992-M', status: 'moving', zone: 'Durban Depot', hasAlert: false, safetyScore: 78, lastUpdated: '14:21:50', stale: false},
    {id: 'TRK-441-Z', status: 'idle', zone: 'Pretoria Depot', hasAlert: true, safetyScore: 80, lastUpdated: '14:18:33', stale: false},
    {id: 'VAN-102-L', status: 'offline', zone: 'null', hasAlert: true, safetyScore: null, lastUpdated: '13:45:01', stale: true},
]

const mockFleetSummary = {
    totalVehicles: 15,
    avgSafetyScore: 84.2,
    avgSafetyScoreDelta: 2.4,
    activeTripsToday: 7,
    lowestScoringVehicle: {id: 'VAN-102-L',
                            score: 42},
}

export async function getVehicles(){
    return mockVehicles
}

export async function getVehicleById(id){
    return mockVehicles.find((v) => v.id === id) ?? null
}

export async function getFleetSummary() {
    return mockFleetSummary
}