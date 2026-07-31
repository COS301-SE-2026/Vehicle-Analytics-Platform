import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteZoneModal from '@/components/geofence/DeleteZoneModal';

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }) => (
    <div data-testid="alert-dialog" data-open={open}>
      {open ? children : null}
    </div>
  ),
  AlertDialogContent: ({ children, className }) => (
    <div data-testid="alert-dialog-content" className={className}>
      {children}
    </div>
  ),
  AlertDialogHeader: ({ children }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children, className }) => (
    <h2 data-testid="alert-dialog-title" className={className}>
      {children}
    </h2>
  ),
  AlertDialogDescription: ({ children, className }) => (
    <p data-testid="alert-dialog-description" className={className}>
      {children}
    </p>
  ),
  AlertDialogFooter: ({ children, className }) => (
    <div data-testid="alert-dialog-footer" className={className}>
      {children}
    </div>
  ),
  AlertDialogCancel: ({ children, className, onClick }) => (
    <button
      data-testid="alert-dialog-cancel"
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, className, onClick }) => (
    <button
      data-testid="alert-dialog-action"
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  TriangleAlert: ({ className }) => (
    <svg data-testid="triangle-alert-icon" className={className} />
  ),
}));

const mockZone = { id: 1, name: 'VAPOR' };

describe('DeleteZoneModal', () => {
  test('does not render dialog content when closed', () => {
    render(
      <DeleteZoneModal 
        open={false} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );
   
    const dialog = screen.getByTestId('alert-dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
    expect(screen.queryByText(/delete zone/i)).not.toBeInTheDocument();
  });

  test('renders the zone name when open', () => {
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );
    expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete Zone');
    expect(screen.getByText('VAPOR')).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  test('renders gracefully when zone is undefined', () => {
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={undefined} 
        onConfirm={() => {}}
      />
    );

    expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete Zone');
    expect(screen.getByText(/zone\?/i)).toBeInTheDocument();
  });

  test('calls onConfirm with the zone when Delete is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = jest.fn();

    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={handleConfirm}
      />
    );

    const deleteButton = screen.getByTestId('alert-dialog-action');
    await user.click(deleteButton);
    expect(handleConfirm).toHaveBeenCalledWith(mockZone);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenChange with false when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const handleOpenChange = jest.fn();
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={handleOpenChange} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );
    const cancelButton = screen.getByTestId('alert-dialog-cancel');
    await user.click(cancelButton); 
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  test('shows alert icon when dialog is open', () => {
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );
    expect(screen.getByTestId('triangle-alert-icon')).toBeInTheDocument();
  });

  test('delete button has correct styling and text', () => {
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );

    const deleteButton = screen.getByTestId('alert-dialog-action');
    expect(deleteButton).toHaveTextContent('Delete');
    expect(deleteButton).toHaveClass('bg-fleet-blue');
    expect(deleteButton).toHaveClass('text-white');
  });

  test('cancel button has correct styling and text', () => {
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );
    const cancelButton = screen.getByTestId('alert-dialog-cancel');
    expect(cancelButton).toHaveTextContent('Cancel');
    expect(cancelButton).toHaveClass('text-fleet-secondary');
  });

  test('description includes zone name in bold', () => {
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );

    const description = screen.getByTestId('alert-dialog-description');
    expect(description).toHaveTextContent('VAPOR');
    const zoneSpan = screen.getByText('VAPOR');
    expect(zoneSpan).toHaveClass('font-medium');
  });

  test('does not call onConfirm when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = jest.fn();
    render(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={handleConfirm}
      />
    );

    const cancelButton = screen.getByTestId('alert-dialog-cancel');
    await user.click(cancelButton);
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});

describe('DeleteZoneModal Integration', () => {
  test('modal renders content when open prop changes to true', () => {
    const { rerender } = render(
      <DeleteZoneModal 
        open={false} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );

    expect(screen.getByTestId('alert-dialog')).toHaveAttribute('data-open', 'false');
    expect(screen.queryByText('Delete Zone')).not.toBeInTheDocument();
    rerender(
      <DeleteZoneModal 
        open={true} 
        onOpenChange={() => {}} 
        zone={mockZone} 
        onConfirm={() => {}}
      />
    );
    expect(screen.getByTestId('alert-dialog')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Delete Zone')).toBeInTheDocument();
  });

  test('displays different zone names correctly', () => {
    const zones = [
      { id: 1, name: 'Zone Alpha' },
      { id: 2, name: 'Warehouse District' },
      { id: 3, name: 'Test Zone 123' },
    ];

    zones.forEach((zone) => {
      const { unmount } = render(
        <DeleteZoneModal 
          open={true} 
          onOpenChange={() => {}} 
          zone={zone} 
          onConfirm={() => {}}
        />
      );

      expect(screen.getByText(zone.name)).toBeInTheDocument();
      unmount();
    });
  });
});