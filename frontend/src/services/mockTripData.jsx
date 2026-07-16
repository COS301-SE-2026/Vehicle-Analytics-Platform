const mockVehicleDetail = {
    id: 'TRK-2024-X1',
    device_id: 'DEV-2024',
    status: 'active',
    latitude: -25.9895,
    longitude: 28.1281,
    speed: 72,
    total_odometer: 48213.6,
    ignition: 'Ignition On',
    movement: 'Movement On',
    last_update: '2026-07-14T12:45:00Z',
    //UC 6 endpont must have these
    tripStartTime: new Date(Date.now() - 84*60*1000).toISOString(), //just to match the wireframe
    speedLimit: 60,
    todaySafetyScore: 92,
}

const mockRecentEvents = [
    {
        type: 'harsh_braking',
        event_category: 'unsafe_driving',
        speed: 68,
        latitude: -25.9901,
        longitude: 28.1275,
        timestamp: '2026-07-14T12:45:00Z',
    },

    {
        type: 'speeding',
        event_category: 'unsafe_driving',
        speed: 72,
        latitude: -26.0523,
        longitude: 28.0587,
        timestamp: '2026-07-14T12:12:00Z'
    },
    {
        type: 'harsh_acceleration',
        event_category: 'unsafe_driving',
        speed: 45,
        latitude: -25.9968,
        longitude: 28.1156,
        timestamp: '2026-07-14T11:45:00Z'
    },
]

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getVehicleById(vehicleId){
    await delay()
    if (mockVehicleDetail.id !== vehicleId){
        return null
    }
    return{
        vehicle: mockVehicleDetail,
        recent_events: mockRecentEvents,
    }
}