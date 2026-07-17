const mockTrips = [
    {
        id: 'trip-001',
        vehicleId: 'TRK-2024-X1',
        date: '2026-07-14',
        startTime: '09:15 AM',
        endTime: '09:52 AM',
        distanceKm: 22.3,
        safetyScore: 92,
        harshBrakingCount: 2,
        harshAccelerationCount: 1,
        harshCorneringCount: 0,
        routeLabel: 'Route #TRP-6031',
    },

    {
        id: 'trip-002',
        vehicleId: 'TRK-2024-X1',
        date: '2026-07-13',
        startTime: '02:30 PM',
        endTime: '03:15 PM',
        distanceKm: 18.2,
        safetyScore: 85,
        harshBrakingCount: 1,
        harshAccelerationCount: 3,
        harshCorneringCount: 1,
        routeLabel: 'Route #TRP-5988',
    },

    {
        id: 'trip-003',
        vehicleId: 'TRK-2024-X1',
        date: '2026-07-13',
        startTime: '10:40 AM',
        endTime: '11:20 AM',
        distanceKm: 31.4,
        safetyScore: 78,
        harshBrakingCount: 3,
        harshAccelerationCount: 2,
        harshCorneringCount: 2,
        routeLabel: 'Route #TRP-5972',
    },
]

const mockDailyScores = [
    {date: '2026-07-08', score: 81},
    {date: '2026-07-09', score: 88},
    {date: '2026-07-10', score: 79},
    {date: '2026-07-11', score: 90},
    {date: '2026-07-12', score: 85},
    {date: '2026-07-13', score: 82},
    {date: '2026-07-14', score: 92},
]

const mockOverallStats = {
    vehicleId: 'TRK-2024-X1',
    overallSafetyScore: 87,
    overallRating: 'Strong Overall',
    totalDistanceKm: 12482,
    totalTrips: 842,
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getTripHistory(vehicleId) {
    await delay()
    return mockTrips.filter((trip) => trip.vehicleId === vehicleId)
}

export async function getDailySafetyScores(vehicleId) {
    await delay()
    console.log('getDailySafetyScares called with:', JSON.stringify(vehicleId), 'expected:', JSON.stringify(mockOverallStats.vehicleId))
    if (mockOverallStats.vehicleId !== vehicleId){
        return []
    }

    return mockDailyScores
}

export async function getOverallStats(vehicleId) {
    await delay()

    if (mockOverallStats.vehicleId !== vehicleId){
        return null
    }

    return mockOverallStats
}