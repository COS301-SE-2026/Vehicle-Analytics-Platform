// frontend/src/services/riskService.js

import api from './api';

export async function getVehicleRisk(vehicleId, days = 30) {
  try {
    const res = await api.get(`/api/risk/vehicle/${vehicleId}`, {
      params: { days },
    });
    return res.data.data || null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.error('getVehicleRisk error:', err);
    return null;
  }
}

export async function getFleetRisk() {
  try {
    const res = await api.get('/api/risk/fleet');
    return res.data.data?.vehicles || [];
  } catch (err) {
    console.error('getFleetRisk error:', err);
    return [];
  }
}

export async function getCoachingHistory(vehicleId) {
  try {
    const res = await api.get(`/api/risk/vehicle/${vehicleId}/coaching`);
    return res.data.data || null;
  } catch (err) {
    console.error('getCoachingHistory error:', err);
    return null;
  }
}

export async function getRiskNotifications(since) {
  try {
    const res = await api.get('/api/risk/notifications', {
      params: since ? { since } : {},
    });
    return res.data.data || { notifications: [], checked_at: new Date().toISOString() };
  } catch (err) {
    console.error('getRiskNotifications error:', err);
    return { notifications: [], checked_at: new Date().toISOString() };
  }
}

export async function getSimilarVehicles(vehicleId, k = 5) {
  try {
    const res = await api.get(`/api/risk/vehicle/${vehicleId}/similar`, {
      params: { k },
    });
    return res.data.data?.similar || [];
  } catch (err) {
    console.error('getSimilarVehicles error:', err);
    return [];
  }
}
