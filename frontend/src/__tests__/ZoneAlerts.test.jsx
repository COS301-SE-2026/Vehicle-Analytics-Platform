import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoneAlerts } from '@/components/geofence/ZoneAlerts';

jest.mock('@/services/geofenceServices', () => ({
  getGeofenceEvents: jest.fn(),
}));

import { getGeofenceEvents } from '@/services/geofenceServices';

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, type }) => (
    <button type={type || 'button'} onClick={onClick} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ children }) => <div data-testid="select-value">{children}</div>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children }) => <div data-testid="select-item">{children}</div>,
}));

jest.mock('@/components/geofence/ZoneActivityDrawer', () => ({
  ZoneActivityDrawer: jest.fn(({ open, onOpenChange }) => (
    <div data-testid="activity-drawer">
      {open && (
        <div role="dialog">
          <div>Drawer Content</div>
          <button data-testid="close-drawer" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  )),
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }) => <svg data-testid="alert-icon" className={className}>Alert</svg>,
  Bell: ({ className }) => <svg data-testid="bell-icon" className={className}>Bell</svg>,
  CheckCircle2: ({ className }) => <svg data-testid="check-icon" className={className}>Check</svg>,
}));

const asResponse = (events) => ({ total: events.length, events });

const defaultAlerts = [
  { id: 1, type: 'alert', message: 'TRK-2024-X1 entered Pretoria Depot', time: 'Today, 14:22:05' },
  { id: 2, type: 'notification', message: 'TRK-552-Z exit Durban Depot', time: 'Today, 11:45:05' },
  { id: 3, type: 'notification', message: 'TRK-881-A entered Durban Depot', time: 'Today, 09:22:05' },
];

describe('ZoneAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders an empty state gracefully with no alerts', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse([]));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /zone alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all activity/i })).toBeInTheDocument();
    expect(screen.queryByText(/depot/i)).not.toBeInTheDocument();
  });

});