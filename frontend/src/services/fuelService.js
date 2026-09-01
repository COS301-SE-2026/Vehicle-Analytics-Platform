import api from './api';

export const getVehicleFuelHistory = async (vehicleId, period = 'week', limit = 30) => {
    try {
        const response = await api.get(`/api/fuel/vehicle/${vehicleId}/history`, {
            params: { period, limit }
        });
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching vehicle fuel history:', error);
        return [];
    }
};

export const getVehicleFuelTrend = async (vehicleId, days = 30) => {
    try {
        const response = await api.get(`/api/fuel/vehicle/${vehicleId}/trend`, {
            params: { days }
        });
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching vehicle fuel trend:', error);
        return [];
    }
};

export const getFleetFuelHistory = async (period = 'week', limit = 10) => {
    try {
        const response = await api.get('/api/fuel/fleet/history', {
            params: { period, limit }
        });
        return response.data.data || [];
    } catch (error) {
        console.error('Error fetching fleet fuel history:', error);
        return [];
    }
};

export const getFuelDashboard = async () => {
    try {
        const response = await api.get('/api/fuel/dashboard');
        return response.data.data || null;
    } catch (error) {
        console.error('Error fetching fuel dashboard:', error);
        return null;
    }
};

export const getVehicleFuelStats = async (vehicleId, days = 30) => {
    try {
        const response = await api.get(`/api/fuel/vehicle/${vehicleId}/history`, {
            params: { period: 'week', limit: 10 }
        });
        const data = response.data.data || [];
        if (data.length > 0) {
            const totalDistance = data.reduce((sum, h) => sum + Number(h.total_distance || 0), 0);
            const totalFuel = data.reduce((sum, h) => sum + Number(h.total_fuel || 0), 0);
            const avgEfficiency = totalDistance > 0 && totalFuel > 0 ? totalDistance / totalFuel : 0;
            return {
                avg_efficiency: avgEfficiency,
                total_distance: totalDistance,
                total_fuel: totalFuel,
                trip_count: data.reduce((sum, h) => sum + Number(h.trip_count || 0), 0)
            };
        }
        return { avg_efficiency: 0, total_distance: 0, total_fuel: 0, trip_count: 0 };
    } catch (error) {
        console.error('Error fetching vehicle fuel stats:', error);
        return { avg_efficiency: 0, total_distance: 0, total_fuel: 0, trip_count: 0 };
    }
};

export const calculateDailyHistory = async (vehicleId, date) => {
    try {
        const response = await api.post(`/api/fuel/vehicle/${vehicleId}/calculate`, null, {
            params: { date }
        });
        return response.data.data || null;
    } catch (error) {
        console.error('Error calculating daily history:', error);
        return null;
    }
};
