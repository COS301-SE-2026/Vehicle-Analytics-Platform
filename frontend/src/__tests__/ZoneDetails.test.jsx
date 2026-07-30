import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoneDetails } from '@/components/geofence/ZoneDetails';

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, placeholder, className, ...props }) => (
    <input id={id} placeholder={placeholder} className={className} data-testid="zone-input" {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, type, onClick, className, disabled }) => (
    <button type={type || 'button'} onClick={onClick} className={className} disabled={disabled}>
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

describe('ZoneDetails form', () => {
  test('render name input, trigger type options, and buttons', () => {
    render(<ZoneDetails />);
    expect(screen.getByLabelText(/zone name/i)).toBeInTheDocument();
    expect(screen.getByTestId('toggle-entry')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-exit')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-both')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save zone/i })).toBeInTheDocument();
  });

  test('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<ZoneDetails />);
    await user.click(screen.getByRole('button', { name: /save zone/i }));
    expect(await screen.findByText('Zone name is required')).toBeInTheDocument();
    expect(await screen.findByText('Select a trigger type')).toBeInTheDocument();
  });

  test('submits successfully with valid name and trigger type', async () => {
    const user = userEvent.setup();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<ZoneDetails />);
    await user.type(screen.getByLabelText(/zone name/i), 'Pretoria Depot');
    await user.click(screen.getByTestId('toggle-entry'));
    await user.click(screen.getByRole('button', { name: /save zone/i }));
    expect(logSpy).toHaveBeenCalledWith(
      'Zone saved:',
      expect.objectContaining({ name: 'Pretoria Depot', triggerType: 'entry' })
    );
    logSpy.mockRestore();
  });

  test('only one trigger type can be active at a time', async () => {
    const user = userEvent.setup();
    render(<ZoneDetails />);
    const entryBtn = screen.getByTestId('toggle-entry');
    const exitBtn = screen.getByTestId('toggle-exit');
    expect(entryBtn).toHaveAttribute('data-state', 'off');
    expect(exitBtn).toHaveAttribute('data-state', 'off');
    await user.click(entryBtn);
    expect(entryBtn).toHaveAttribute('data-state', 'on');
    expect(exitBtn).toHaveAttribute('data-state', 'off');
    await user.click(exitBtn);
    expect(exitBtn).toHaveAttribute('data-state', 'on');
    expect(entryBtn).toHaveAttribute('data-state', 'off');
  });

  test('cancel button does not crash the form', async () => {
    const user = userEvent.setup();
    render(<ZoneDetails />);
    await user.type(screen.getByLabelText(/zone name/i), 'Test Zone');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByLabelText(/zone name/i)).toHaveValue('Test Zone');
  });
});