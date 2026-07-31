import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoneActivityDrawer } from '@/components/geofence/ZoneActivityDrawer';

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }) => (
    <div data-testid="sheet" data-open={open}>
      {children}
    </div>
  ),
  SheetContent: ({ children, className }) => (
    <div data-testid="sheet-content" className={className}>
      {children}
    </div>
  ),
  SheetHeader: ({ children }) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children, className }) => (
    <h2 data-testid="sheet-title" className={className}>{children}</h2>
  ),
  SheetDescription: ({ children, className }) => (
    <p data-testid="sheet-description" className={className}>{children}</p>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, type }) => (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }) => <svg data-testid="alert-triangle-icon" className={className} />,
  Bell: ({ className }) => <svg data-testid="bell-icon" className={className} />,
  CheckCircle2: ({ className }) => <svg data-testid="check-circle-icon" className={className} />,
  LogOut: ({ className }) => <svg data-testid="logout-icon" className={className} />,
  ChevronLeft: ({ className }) => <svg data-testid="chevron-left-icon" className={className} />,
  ChevronRight: ({ className }) => <svg data-testid="chevron-right-icon" className={className} />,
}));

// getGeofenceEvents() currently resolves to { total, events: [{ id, type,
// message, time, read }] } -- there is no `acknowledged` field coming
// back from the real service yet. The component itself already branches
// on entry.acknowledged (ACKNOWLEDGED badge, text color, checkmark
// color), so we include it here to exercise that rendering logic.
// If/when the service is updated to actually return `acknowledged`,
// swap this mock data for real fixture shapes from that change.
const mockEvents = [
  { id: 1, type: 'alert', message: 'TRK-2024-X1 entered Pretoria Depot', time: '14:22:05', acknowledged: false },
  { id: 2, type: 'exit', message: 'TRK-552-Z exit Durban Depot', time: '11:45:05', acknowledged: true },
  { id: 3, type: 'entry', message: 'TRK-881-A entered Durban Depot', time: '11:45:12', acknowledged: false },
  { id: 4, type: 'notification', message: 'TRK-881-A exit Johannesburg Port', time: '08:05:00', acknowledged: true },
];

jest.mock('@/services/geofenceServices', () => ({
  getGeofenceEvents: jest.fn(() =>
    Promise.resolve({ total: mockEvents.length, events: mockEvents })
  ),
}));

import { getGeofenceEvents } from '@/services/geofenceServices';

describe('ZoneActivityDrawer', () => {
  beforeEach(() => {
    getGeofenceEvents.mockClear();
    getGeofenceEvents.mockResolvedValue({ total: mockEvents.length, events: mockEvents });
  });

  test('renders title and description when open', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId('sheet-title')).toHaveTextContent('All Zone Activity');
    expect(screen.getByTestId('sheet-description')).toHaveTextContent(
      'Historical and real-time geofencing event log'
    );
    await screen.findByText(mockEvents[0].message);
  });

  test('does not render content when closed', () => {
    render(<ZoneActivityDrawer open={false} onOpenChange={() => {}} />);
    const sheet = screen.getByTestId('sheet');
    expect(sheet).toHaveAttribute('data-open', 'false');
    expect(getGeofenceEvents).not.toHaveBeenCalled();
  });

  test('renders all mock activity log entries with message and time', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);

    expect(await screen.findByText('TRK-2024-X1 entered Pretoria Depot')).toBeInTheDocument();
    expect(screen.getByText('TRK-552-Z exit Durban Depot')).toBeInTheDocument();
    expect(screen.getByText('TRK-881-A entered Durban Depot')).toBeInTheDocument();
    expect(screen.getByText('TRK-881-A exit Johannesburg Port')).toBeInTheDocument();

    expect(screen.getByText('14:22:05')).toBeInTheDocument();
    expect(screen.getByText('11:45:05')).toBeInTheDocument();
    expect(screen.getByText('11:45:12')).toBeInTheDocument();
    expect(screen.getByText('08:05:00')).toBeInTheDocument();
  });

  test('renders pagination controls with page 1 active by default', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    const pageButtons = screen.getAllByRole('button').filter(
      (b) => b.textContent && /^[1-9]$/.test(b.textContent)
    );
    expect(pageButtons).toHaveLength(3);
    expect(pageButtons[0]).toHaveClass('bg-fleet-blue');
    expect(pageButtons[0]).toHaveTextContent('1');
    expect(pageButtons[1]).not.toHaveClass('bg-fleet-blue');
    expect(pageButtons[2]).not.toHaveClass('bg-fleet-blue');
  });

  test('switching to page 2 changes pagination state', async () => {
    const user = userEvent.setup();
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    await user.click(screen.getByRole('button', { name: '2' }));
    const pageButtons = screen.getAllByRole('button').filter(
      (b) => b.textContent && /^[1-9]$/.test(b.textContent)
    );
    expect(pageButtons[1]).toHaveClass('bg-fleet-blue');
    expect(pageButtons[0]).not.toHaveClass('bg-fleet-blue');
  });

  test('previous button is disabled on page 1', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    const prevButton = screen.getByTestId('chevron-left-icon').closest('button');
    expect(prevButton).toBeDisabled();
  });

  test('next button is disabled on last page', async () => {
    const user = userEvent.setup();
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    await user.click(screen.getByRole('button', { name: '3' }));
    const nextButton = screen.getByTestId('chevron-right-icon').closest('button');
    expect(nextButton).toBeDisabled();
  });

  test('shows ACKNOWLEDGED badge only for acknowledged entries', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    const badges = screen.getAllByTestId('badge');
    const ackBadges = badges.filter((b) => b.textContent === 'ACKNOWLEDGED');
    expect(ackBadges).toHaveLength(2);
  });

  test('renders correct icon per entry type', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    expect(screen.getAllByTestId('bell-icon').length).toBeGreaterThan(0);
    const checkButtons = screen.getAllByTestId('check-circle-icon').filter(
      (el) => el.parentElement.tagName === 'BUTTON'
    );
    expect(checkButtons).toHaveLength(mockEvents.length);
  });

  test('acknowledged entries have different text color than unacknowledged', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    const acknowledgedMsg = screen.getByText('TRK-552-Z exit Durban Depot');
    const unacknowledgedMsg = screen.getByText('TRK-2024-X1 entered Pretoria Depot');
    expect(acknowledgedMsg).toHaveClass('text-fleet-secondary');
    expect(unacknowledgedMsg).toHaveClass('text-fleet-text');
  });

  test('shows correct count in activity log badge', async () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await screen.findByText(mockEvents[0].message);

    expect(screen.getByText(`Showing ${mockEvents.length} of ${mockEvents.length}`)).toBeInTheDocument();
  });

  test('sheet open state reflects the open prop', () => {
    const { rerender } = render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'true');

    rerender(<ZoneActivityDrawer open={false} onOpenChange={() => {}} />);
    expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'false');
  });
});
