import { getVehicleFuelHistory, getFleetFuelHistory, getVehicleFuelTrend } from '../services/fuelService';
import api from '../services/api';

jest.mock('../services/api');

describe('Fuel Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getVehicleFuelHistory should return data on success', async () => {
        const mockData = { data: { data: [{ period_start: '2026-08-31' }] } };
        api.get.mockResolvedValue(mockData);
        const result = await getVehicleFuelHistory('1000');
        expect(result).toEqual(mockData.data.data);
    });

    test('getVehicleFuelHistory should return empty array on error', async () => {
        api.get.mockRejectedValue(new Error('Network error'));
        const result = await getVehicleFuelHistory('1000');
        expect(result).toEqual([]);
    });

    test('getFleetFuelHistory should return data on success', async () => {
        const mockData = { data: { data: [{ period_start: '2026-08-31' }] } };
        api.get.mockResolvedValue(mockData);
        const result = await getFleetFuelHistory();
        expect(result).toEqual(mockData.data.data);
    });

    test('getFleetFuelHistory should return empty array on error', async () => {
        api.get.mockRejectedValue(new Error('Network error'));
        const result = await getFleetFuelHistory();
        expect(result).toEqual([]);
    });

    test('getVehicleFuelTrend should return data on success', async () => {
        const mockData = { data: { data: [{ period_start: '2026-08-31' }] } };
        api.get.mockResolvedValue(mockData);
        const result = await getVehicleFuelTrend('1000');
        expect(result).toEqual(mockData.data.data);
    });

    test('getVehicleFuelTrend should return empty array on error', async () => {
        api.get.mockRejectedValue(new Error('Network error'));
        const result = await getVehicleFuelTrend('1000');
        expect(result).toEqual([]);
    });
});
