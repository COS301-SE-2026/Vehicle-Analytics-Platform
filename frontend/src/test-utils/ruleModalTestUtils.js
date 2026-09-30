import useAuthStore from '@/store/authStore';
import { useToast } from '@/components/alerts/ToastProvider';

export const fleetGroups = [
  { id: 'fg-1', name: 'Delivery Fleet' },
  { id: 'fg-2', name: 'Long Haul' },
];

export const baseRule = {
  id: 'rule-99',
  name: 'Highway Speeding',
  fleet_group_id: 'fg-1',
  condition_type: 'speed_threshold',
  condition_params: { max_speed_kmh: 120 },
  status: 'active',
};

export const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  dismiss: jest.fn(),
};

/** Call from beforeEach after jest.mock(...) calls for axios/authStore/ToastProvider. */
export function setupCommonMocks() {
  jest.clearAllMocks();
  useToast.mockReturnValue(mockToast);
  useAuthStore.getState.mockReturnValue({ token: 'fake-token' });
}
