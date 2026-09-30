import useAuthStore from '../store/authStore';
import { transferVehicles } from '../services/fleetGroupService';

jest.mock('../store/authStore', () => ({
    __esModule: true,
    default: { getState: jest.fn() },
}));

const respond = (ok, body) => ({ ok, json: async () => body });

describe('transferVehicles', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        useAuthStore.getState.mockReturnValue({ token: 'test-token' });
    });

    afterEach(() => jest.clearAllMocks());

    it('sends a PATCH to the source group with the vehicles and target', async () => {
        global.fetch.mockResolvedValue(respond(true, {
            data: { transferred: ['1043'], not_in_group: [] },
        }));

        const result = await transferVehicles(3, 7, ['1043']);

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/api\/fleet-groups\/3\/vehicles\/transfer$/);
        expect(options.method).toBe('PATCH');
        expect(options.headers.Authorization).toBe('Bearer test-token');
        expect(JSON.parse(options.body)).toEqual({ vehicleIds: ['1043'], targetGroupId: 7 });
        expect(result).toEqual({ transferred: ['1043'], not_in_group: [] });
    });

    it('throws the error message sent by the backend', async () => {
        global.fetch.mockResolvedValue(respond(false, { error: 'Target fleet group not found' }));

        await expect(transferVehicles(3, 99, ['1043'])).rejects.toThrow('Target fleet group not found');
    });

    it('falls back to a generic message when the response has no body', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            json: async () => { throw new Error('not json'); },
        });

        await expect(transferVehicles(3, 7, ['1043'])).rejects.toThrow('Failed to transfer vehicles');
    });
});