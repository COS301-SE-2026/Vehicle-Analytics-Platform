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

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, defaultValue }) => (
    <div data-testid="select" data-default={defaultValue}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }) => (
    <button data-testid="select-trigger" className={className}>
      {children}
    </button>
  ),
  SelectValue: () => <span data-testid="select-value">All Zones</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
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
  Gauge: ({ className }) => <svg data-testid="gauge-icon" className={className} />,
  Zap: ({ className }) => <svg data-testid="zap-icon" className={className} />,
  RotateCw: ({ className }) => <svg data-testid="rotate-icon" className={className} />,
  CornerUpRight: ({ className }) => <svg data-testid="corner-icon" className={className} />,
  AlertCircle: ({ className }) => <svg data-testid="alert-circle-icon" className={className} />,
}));

describe('ZoneActivityDrawer', () => {
  test('renders title and description when open', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    
    expect(screen.getByTestId('sheet-title')).toHaveTextContent('All Zone Activity');
    expect(screen.getByTestId('sheet-description')).toHaveTextContent(
      'Historical and real-time geofencing event log'
    );
  });

  test('does not render content when closed', () => {
    render(<ZoneActivityDrawer open={false} onOpenChange={() => {}} />);
    const sheet = screen.getByTestId('sheet');
    expect(sheet).toHaveAttribute('data-open', 'false');
  });

  test('renders all mock activity log entries with message and time', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    
    expect(screen.getByText('TRK-2024-X1 entered Pretoria Deport')).toBeInTheDocument();
    expect(screen.getByText('TRK-552-Z exit Durban Depot')).toBeInTheDocument();
    expect(screen.getByText('TRK-881-A entered Durban Depot')).toBeInTheDocument();
    expect(screen.getByText('TRK-881-A exit Johannesburg Port')).toBeInTheDocument();
    
    expect(screen.getByText('14:22:05')).toBeInTheDocument();
    expect(screen.getByText('11:45:05')).toBeInTheDocument();
    expect(screen.getByText('11:45:12')).toBeInTheDocument();
    expect(screen.getByText('08:05:00')).toBeInTheDocument();
  });

  test('renders pagination controls with page 1 active by default', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
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
    await user.click(screen.getByRole('button', { name: '2' }));
    const pageButtons = screen.getAllByRole('button').filter(
      (b) => b.textContent && /^[1-9]$/.test(b.textContent)
    );
    expect(pageButtons[1]).toHaveClass('bg-fleet-blue');
    expect(pageButtons[0]).not.toHaveClass('bg-fleet-blue');
  });

  test('previous button is disabled on page 1', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    
    const prevButton = screen.getByTestId('chevron-left-icon').closest('button');
    expect(prevButton).toBeDisabled();
  });

  test('next button is disabled on last page', async () => {
    const user = userEvent.setup();
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: '3' }));
    const nextButton = screen.getByTestId('chevron-right-icon').closest('button');
    expect(nextButton).toBeDisabled();
  });

  test('renders safety breakdown stats for each zone', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const statText = (text) => screen.getAllByText(text).filter(
      (el) => el.tagName !== 'BUTTON' && !el.closest('[data-testid="select-item"]')
    );
    expect(statText('Pretoria Port').length).toBeGreaterThan(0);
    expect(statText('Durban Port').length).toBeGreaterThan(0);
    expect(statText('12').length).toBeGreaterThan(0);
    expect(statText('4').length).toBeGreaterThan(0);
    expect(statText('2').length).toBeGreaterThan(0);
    expect(statText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Speeding').length).toBe(2);
    expect(screen.getAllByText('Braking').length).toBe(2);
    expect(screen.getAllByText('Accel').length).toBe(2);
    expect(screen.getAllByText('Corner').length).toBe(2);
    expect(screen.getAllByText('Crash').length).toBe(2);
  });

  test('shows ACKNOWLEDGED badge for acknowledged entries', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.filter(b => b.textContent === 'ACKNOWLEDGED')).toHaveLength(2);
  });

  test('renders correct icons for different entry types', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    const typeIcon = screen.getAllByTestId('check-circle-icon').find(
      (el) => el.parentElement.tagName !== 'BUTTON'
    );
    expect(typeIcon).toBeInTheDocument();
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
  });

  test('renders zone filter dropdown with options', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getByTestId('select-value')).toHaveTextContent('All Zones');
    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toBeInTheDocument();
  });

  test('shows correct count in activity log badge', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    
    const badge = screen.getByText('Showing 4 of 10');
    expect(badge).toBeInTheDocument();
  });

  test('renders CheckCircle2 button for each entry', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const checkButtons = screen.getAllByTestId('check-circle-icon').filter(
      (el) => el.parentElement.tagName === 'BUTTON'
    );
    expect(checkButtons).toHaveLength(4);
  });

  test('acknowledged entries have different text color', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const acknowledgedMsg = screen.getByText('TRK-552-Z exit Durban Depot');
    const unacknowledgedMsg = screen.getByText('TRK-2024-X1 entered Pretoria Deport');
    expect(acknowledgedMsg).toHaveClass('text-fleet-secondary');
    expect(unacknowledgedMsg).toHaveClass('text-fleet-text');
  });


  test('safety stats icons have correct styling', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const icons = screen.getAllByTestId(/gauge-icon|zap-icon|rotate-icon|corner-icon|alert-circle-icon/);
    icons.forEach(icon => {
      expect(icon).toHaveClass('text-fleet-secondary');
    });
  });

  test('sheet is open when open prop is true', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const sheet = screen.getByTestId('sheet');
    expect(sheet).toHaveAttribute('data-open', 'true');
  });

  test('sheet is closed when open prop is false', () => {
    render(<ZoneActivityDrawer open={false} onOpenChange={() => {}} />);
    const sheet = screen.getByTestId('sheet');
    expect(sheet).toHaveAttribute('data-open', 'false');
  });

  test('safety stats are displayed in grid layout', () => {
    render(<ZoneActivityDrawer open={true} onOpenChange={() => {}} />);
    const safetySections = screen.getAllByText(/Port/).filter(
      (el) => el.className.includes('mb-3')
    );
    expect(safetySections).toHaveLength(2);
    const stats = screen.getAllByText(/Speeding|Braking|Accel|Corner|Crash/);
    expect(stats.length).toBe(10); 
  });
});