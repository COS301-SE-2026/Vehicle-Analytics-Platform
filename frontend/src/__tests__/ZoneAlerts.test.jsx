import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoneAlerts } from '@/components/geofence/ZoneAlerts';

jest.mock('@/services/geofenceServices', () => ({
  getGeofenceEvents: jest.fn(),
}));

import { getGeofenceEvents } from '@/services/geofenceServices';

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, type }) => (
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

  test('renders default mock alerts with message and time', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse(defaultAlerts));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/entered pretoria depot/i)).toBeInTheDocument();
    expect(screen.getByText(/exit durban depot/i)).toBeInTheDocument();
    expect(screen.getByText(/entered durban depot/i)).toBeInTheDocument();
    expect(screen.getByText('Today, 14:22:05')).toBeInTheDocument();
    expect(screen.getByText('Today, 11:45:05')).toBeInTheDocument();
    expect(screen.getByText('Today, 09:22:05')).toBeInTheDocument();
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

  test('falls back to Bell icon for an unknown alert type', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse([
      { id: 1, type: 'unknown-type', message: 'Weird alert', time: 'Now' },
    ]));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Weird alert')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  test('opens ZoneActivityDrawer when "View All Activity" is clicked', async () => {
    const user = userEvent.setup();
    getGeofenceEvents.mockResolvedValue(asResponse(defaultAlerts));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /view all activity/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  test('applies urgent styling for alert type alerts', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse([
      { id: 1, type: 'alert', message: 'Urgent alert', time: 'Now' },
      { id: 2, type: 'notification', message: 'Normal notification', time: 'Now' },
    ]));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    const urgentElement = screen.getByText('Urgent alert').closest('.rounded-md');
    expect(urgentElement.className).toContain('bg-fleet-alert/10');
    const normalElement = screen.getByText('Normal notification').closest('.rounded-md');
    expect(normalElement.className).not.toContain('bg-fleet-alert/10');
  });

  test('displays correct icon for alert vs notification types', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse([
      { id: 1, type: 'alert', message: 'Alert message', time: 'Now' },
      { id: 2, type: 'notification', message: 'Notification message', time: 'Now' },
    ]));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    expect(screen.getAllByTestId('alert-icon')).toHaveLength(1);
    expect(screen.getAllByTestId('bell-icon')).toHaveLength(1);
  });

  test('renders CheckCircle2 icon for every alert', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse([
      { id: 1, type: 'alert', message: 'Alert 1', time: 'Now' },
      { id: 2, type: 'notification', message: 'Alert 2', time: 'Now' },
    ]));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    expect(screen.getAllByTestId('check-icon')).toHaveLength(2);
  });

  test('renders correct header with proper styling', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse(defaultAlerts));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    const header = screen.getByRole('heading', { name: /zone alerts/i });
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('font-display');
    expect(header.className).toContain('font-medium');
    expect(header.className).toContain('text-lg');
  });

  test('View All Activity button has correct styling and text', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse(defaultAlerts));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /view all activity/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  test('calls onViewAll prop when provided', async () => {
    const mockOnViewAll = jest.fn();
    const user = userEvent.setup();
    getGeofenceEvents.mockResolvedValue(asResponse(defaultAlerts));
    render(<ZoneAlerts onViewAll={mockOnViewAll} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /view all activity/i });
    await user.click(button);
    expect(mockOnViewAll).toHaveBeenCalled();
  });

  test('renders all alerts with unique keys', async () => {
    getGeofenceEvents.mockResolvedValue(asResponse([
      { id: 1, type: 'alert', message: 'Alert 1', time: 'Now' },
      { id: 2, type: 'notification', message: 'Alert 2', time: 'Now' },
      { id: 3, type: 'alert', message: 'Alert 3', time: 'Now' },
    ]));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Alert 1')).toBeInTheDocument();
    expect(screen.getByText('Alert 2')).toBeInTheDocument();
    expect(screen.getByText('Alert 3')).toBeInTheDocument();
  });

  test('drawer closes when onOpenChange is called with false', async () => {
    const user = userEvent.setup();
    getGeofenceEvents.mockResolvedValue(asResponse(defaultAlerts));
    render(<ZoneAlerts />);

    await waitFor(() => {
      expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /view all activity/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('close-drawer'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});