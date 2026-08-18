import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditZoneModal } from '@/components/geofence/EditZoneModal';

const mockZone = { id: 1, name: 'Pretoria Depot', triggerType: 'entry' };

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }) => (
    <div data-testid="alert-dialog" data-open={open}>
      {open ? children : null}
    </div>
  ),
  AlertDialogContent: ({ children, className }) => (
    <div data-testid="alert-dialog-content" className={className}>{children}</div>
  ),
  AlertDialogHeader: ({ children }) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children, className }) => (
    <h2 data-testid="alert-dialog-title" className={className}>{children}</h2>
  ),
  AlertDialogDescription: ({ children, className }) => (
    <p data-testid="alert-dialog-description" className={className}>{children}</p>
  ),
  AlertDialogFooter: ({ children, className }) => (
    <div data-testid="alert-dialog-footer" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, className, ...props }) => (
    <input id={id} className={className} data-testid="edit-input" {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, type, onClick, className, variant }) => (
    <button type={type || 'button'} onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ children, value, onValueChange, className }) => {
    const childArray = Array.isArray(children) ? children : [children];
    return (
      <div data-testid="toggle-group" data-value={value} className={className}>
        {childArray.map((child, index) => {
          if (child && child.props) {
            const childValue = child.props.value;
            return (
              <button
                key={index}
                type="button"
                role="button"
                data-testid={`toggle-${childValue}`}
                data-state={value === childValue ? 'on' : 'off'}
                className={child.props.className}
                onClick={() => {
                  if (value !== childValue) {
                    onValueChange?.(childValue);
                  }
                }}
                value={childValue}
              >
                {child.props.children}
              </button>
            );
          }
          return child;
        })}
      </div>
    );
  },
  ToggleGroupItem: ({ children, value, className }) => (
    <button
      type="button"
      role="button"
      data-testid={`toggle-${value}`}
      data-state="off"
      className={className}
      value={value}
    >
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  Pencil: ({ className }) => <svg data-testid="pencil-icon" className={className} />,
}));

jest.mock('@/schemas/zoneSchema', () => {
  const { z } = require('zod');
  return {
    zoneSchema: z.object({
      name: z.string().min(1, "Zone name is required"),
      triggerType: z.enum(["entry", "exit", "both"], {
        required_error: "Select a trigger type",
      }),
    }),
  };
});

describe('EditZoneModal', () => {
  test('does not render when closed', () => {
    render(
      <EditZoneModal open={false} onOpenChange={() => {}} zone={mockZone} onConfirm={() => {}} />
    );
    expect(screen.getByTestId('alert-dialog')).toHaveAttribute('data-open', 'false');
    expect(screen.queryByText('Edit Zone')).not.toBeInTheDocument();
  });

  test('renders when open with zone data', () => {
    render(
      <EditZoneModal open={true} onOpenChange={() => {}} zone={mockZone} onConfirm={() => {}} />
    );
    expect(screen.getByTestId('alert-dialog')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Edit Zone')).toBeInTheDocument();
    expect(screen.getByText('Pretoria Depot')).toBeInTheDocument();
    expect(screen.getByTestId('edit-input')).toHaveValue('Pretoria Depot');
    expect(screen.getByTestId('toggle-entry')).toHaveAttribute('data-state', 'on');
  });

  test('renders with default values when zone is undefined', () => {
    render(
      <EditZoneModal open={true} onOpenChange={() => {}} zone={undefined} onConfirm={() => {}} />
    );
    expect(screen.getByText('Edit Zone')).toBeInTheDocument();
    expect(screen.getByTestId('edit-input')).toHaveValue('');
  });

  test('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(
      <EditZoneModal open={true} onOpenChange={() => {}} zone={mockZone} onConfirm={() => {}} />
    );
    await user.clear(screen.getByTestId('edit-input'));
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Zone name is required')).toBeInTheDocument();
  });

  test('calls onConfirm with updated zone data and closes modal', async () => {
    const user = userEvent.setup();
    const handleConfirm = jest.fn();
    const handleOpenChange = jest.fn();
    render(
      <EditZoneModal 
        open={true} 
        onOpenChange={handleOpenChange} 
        zone={mockZone} 
        onConfirm={handleConfirm} 
      />
    );
    await user.clear(screen.getByTestId('edit-input'));
    await user.type(screen.getByTestId('edit-input'), 'Updated Depot');
    await user.click(screen.getByTestId('toggle-exit'));
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ 
        id: 1, 
        name: 'Updated Depot', 
        triggerType: 'exit' 
      })
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  test('calls onOpenChange with false when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const handleOpenChange = jest.fn();
    render(
      <EditZoneModal 
        open={true} 
        onOpenChange={handleOpenChange} 
        zone={mockZone} 
        onConfirm={() => {}} 
      />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  test('displays pencil icon', () => {
    render(
      <EditZoneModal open={true} onOpenChange={() => {}} zone={mockZone} onConfirm={() => {}} />
    );
    expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
  });

  test('toggle groups show correct active state based on zone data', () => {
    const zoneWithBoth = { id: 2, name: 'Durban Port', triggerType: 'both' };
    render(
      <EditZoneModal open={true} onOpenChange={() => {}} zone={zoneWithBoth} onConfirm={() => {}} />
    );
    expect(screen.getByTestId('toggle-both')).toHaveAttribute('data-state', 'on');
    expect(screen.getByTestId('toggle-entry')).toHaveAttribute('data-state', 'off');
    expect(screen.getByTestId('toggle-exit')).toHaveAttribute('data-state', 'off');
  });
});