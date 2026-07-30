import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoneAlerts } from '@/components/geofence/ZoneAlerts';

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

describe('ZoneAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders default mock alerts with message and time', () => {
    render(<ZoneAlerts />);
    expect(screen.getByText(/entered pretoria depot/i)).toBeInTheDocument();
    expect(screen.getByText(/exit durban depot/i)).toBeInTheDocument();
    expect(screen.getByText(/entered durban depot/i)).toBeInTheDocument();
    expect(screen.getByText('Today, 14:22:05')).toBeInTheDocument();
    expect(screen.getByText('Today, 11:45:05')).toBeInTheDocument();
    expect(screen.getByText('Today, 09:22:05')).toBeInTheDocument();
  });

  test('renders provided alerts instead of defaults when passed', () => {
    const customAlerts = [
      { id: 99, type: 'alert', message: 'Custom test alert', time: 'Now' },
    ];
    render(<ZoneAlerts alerts={customAlerts} />);
    expect(screen.getByText('Custom test alert')).toBeInTheDocument();
    expect(screen.queryByText(/pretoria depot/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Today, 14:22:05')).not.toBeInTheDocument();
  });

  test('renders an empty state gracefully with no alerts', () => {
    render(<ZoneAlerts alerts={[]} />);
    expect(screen.getByRole('heading', { name: /zone alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all activity/i })).toBeInTheDocument();
    expect(screen.queryByText(/depot/i)).not.toBeInTheDocument();
  });

  test('falls back to Bell icon for an unknown alert type', () => {
    const customAlerts = [
      { id: 1, type: 'unknown-type', message: 'Weird alert', time: 'Now' },
    ];
    render(<ZoneAlerts alerts={customAlerts} />);
    expect(screen.getByText('Weird alert')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  test('opens ZoneActivityDrawer when "View All Activity" is clicked', async () => {
    const user = userEvent.setup();
    render(<ZoneAlerts />);
    await user.click(screen.getByRole('button', { name: /view all activity/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  test('applies urgent styling for alert type alerts', () => {
    const alerts = [
      { id: 1, type: 'alert', message: 'Urgent alert', time: 'Now' },
      { id: 2, type: 'notification', message: 'Normal notification', time: 'Now' },
    ];

    render(<ZoneAlerts alerts={alerts} />);
    const urgentElement = screen.getByText('Urgent alert').closest('.rounded-md');
    expect(urgentElement.className).toContain('bg-fleet-alert/10');
    const normalElement = screen.getByText('Normal notification').closest('.rounded-md');
    expect(normalElement.className).not.toContain('bg-fleet-alert/10');
  });

  test('displays correct icon for alert vs notification types', () => {
    const alerts = [
      { id: 1, type: 'alert', message: 'Alert message', time: 'Now' },
      { id: 2, type: 'notification', message: 'Notification message', time: 'Now' },
    ];

    render(<ZoneAlerts alerts={alerts} />);
    const alertIcons = screen.getAllByTestId('alert-icon');
    expect(alertIcons.length).toBe(1);
    const bellIcons = screen.getAllByTestId('bell-icon');
    expect(bellIcons.length).toBe(1);
  });

  test('renders CheckCircle2 icon for every alert', () => {
    const alerts = [
      { id: 1, type: 'alert', message: 'Alert 1', time: 'Now' },
      { id: 2, type: 'notification', message: 'Alert 2', time: 'Now' },
    ];
    render(<ZoneAlerts alerts={alerts} />);
    const checkIcons = screen.getAllByTestId('check-icon');
    expect(checkIcons.length).toBe(2);
  });

  test('renders correct header with proper styling', () => {
    render(<ZoneAlerts />);
    const header = screen.getByRole('heading', { name: /zone alerts/i });
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('font-display');
    expect(header.className).toContain('font-medium');
    expect(header.className).toContain('text-lg');
  });

  test('View All Activity button has correct styling and text', () => {
    render(<ZoneAlerts />);
    const button = screen.getByRole('button', { name: /view all activity/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  test('calls onViewAll prop when provided', async () => {
    const mockOnViewAll = jest.fn();
    const user = userEvent.setup();
    render(<ZoneAlerts onViewAll={mockOnViewAll} />);
    const button = screen.getByRole('button', { name: /view all activity/i });
    await user.click(button);
    expect(mockOnViewAll).toHaveBeenCalled();
  });

  test('renders all alerts with unique keys', () => {
    const alerts = [
      { id: 1, type: 'alert', message: 'Alert 1', time: 'Now' },
      { id: 2, type: 'notification', message: 'Alert 2', time: 'Now' },
      { id: 3, type: 'alert', message: 'Alert 3', time: 'Now' },
    ];

    render(<ZoneAlerts alerts={alerts} />);
    expect(screen.getByText('Alert 1')).toBeInTheDocument();
    expect(screen.getByText('Alert 2')).toBeInTheDocument();
    expect(screen.getByText('Alert 3')).toBeInTheDocument();
  });

  test('drawer closes when onOpenChange is called with false', async () => {
    const user = userEvent.setup();
    render(<ZoneAlerts />);

    await user.click(screen.getByRole('button', { name: /view all activity/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByTestId('close-drawer'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});