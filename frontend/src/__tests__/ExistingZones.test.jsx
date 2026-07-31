import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExistingZones } from '@/components/geofence/ExistingZones';
import React from 'react';

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }) => <thead>{children}</thead>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr role="row">{children}</tr>,
  TableHead: ({ children }) => <th>{children}</th>,
  TableCell: ({ children }) => <td>{children}</td>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }) => (
    <button type={type || 'button'} onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  Pencil: () => <svg data-testid="pencil-icon" />,
  Trash: () => <svg data-testid="trash-icon" />,
}));

jest.mock('@/components/geofence/DeleteZoneModal', () => ({
  __esModule: true,
  default: ({ open, onOpenChange, zone, onConfirm }) => (
    <div data-testid="delete-modal" data-open={open}>
      {open && (
        <div role="dialog">
          <h2>Delete Zone</h2>
          <p>{zone?.name}</p>
          <button data-testid="confirm-delete" onClick={() => {
            onConfirm?.(zone);
            onOpenChange(false);
          }}>Delete</button>
          <button data-testid="cancel-delete" onClick={() => onOpenChange(false)}>Cancel</button>
        </div>
      )}
    </div>
  ),
}));

jest.mock('@/components/geofence/EditZoneModal', () => ({
  EditZoneModal: ({ open, onOpenChange, zone, onConfirm }) => (
    <div data-testid="edit-modal" data-open={open}>
      {open && (
        <div role="dialog">
          <h2>Edit Zone</h2>
          <input data-testid="edit-input" defaultValue={zone?.name || ''} />
          <button data-testid="confirm-edit" onClick={() => {
            onConfirm?.({ ...zone, name: 'Durban Port Updated' });
            onOpenChange(false);
          }}>Save Changes</button>
          <button data-testid="cancel-edit" onClick={() => onOpenChange(false)}>Cancel</button>
        </div>
      )}
    </div>
  ),
}));

const mockGeofences = [
  { id: 1, name: 'Pretoria Depot', trigger_type: 'entry' },
  { id: 2, name: 'Durban Port', trigger_type: 'both' },
  { id: 3, name: 'Johannesburg Port', trigger_type: 'exit' },
];

jest.mock('@/services/geofenceServices', () => ({
  getGeofences: jest.fn(() =>
    Promise.resolve({ total: 3, geofences: mockGeofences })
  ),
  deleteGeofence: jest.fn(() => Promise.resolve({})),
  updateGeofence: jest.fn(() => Promise.resolve({})),
}));

import { getGeofences } from '@/services/geofenceServices';

describe('ExistingZones', () => {
  beforeEach(() => {
    getGeofences.mockClear();
    getGeofences.mockResolvedValue({ total: 3, geofences: mockGeofences });
  });

  test('renders default mock zones with names and trigger types', async () => {
    render(<ExistingZones />);
    expect(await screen.findByText('Pretoria Depot')).toBeInTheDocument();
    expect(screen.getByText('Durban Port')).toBeInTheDocument();
    expect(screen.getByText('Johannesburg Port')).toBeInTheDocument();
    expect(screen.getAllByText('entry').length).toBeGreaterThan(0);
    expect(screen.getAllByText('both').length).toBeGreaterThan(0);
    expect(screen.getAllByText('exit').length).toBeGreaterThan(0);
  });

  test('renders provided zones instead of defaults when passed', async () => {
    getGeofences.mockResolvedValueOnce({
      total: 1,
      geofences: [{ id: 99, name: 'PE Yard', trigger_type: 'entry' }],
    });
    render(<ExistingZones />);
    expect(await screen.findByText('PE Yard')).toBeInTheDocument();
    expect(screen.queryByText('Pretoria Depot')).not.toBeInTheDocument();
  });

  test('clicking the trash icon opens DeleteZoneModal with the correct zone name', async () => {
    const user = userEvent.setup();
    render(<ExistingZones />);
    await screen.findByText('Pretoria Depot');
    const rows = screen.getAllByRole('row');
    const ptaRow = rows.find((r) => r.textContent.includes('Pretoria Depot'));
    const buttons = ptaRow?.querySelectorAll('button') || [];
    const deleteBtn = buttons[1];
    await user.click(deleteBtn);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Pretoria Depot')).toBeInTheDocument();
  });

  test('confirming delete calls onZonesChanged and closes the modal', async () => {
    const user = userEvent.setup();
    const handleZonesChanged = jest.fn();
    render(<ExistingZones onZonesChanged={handleZonesChanged} />);
    await screen.findByText('Pretoria Depot');
    const rows = screen.getAllByRole('row');
    const ptaRow = rows.find((r) => r.textContent.includes('Pretoria Depot'));
    const buttons = ptaRow?.querySelectorAll('button') || [];
    const deleteBtn = buttons[1];
    await user.click(deleteBtn);
    const confirmDeleteBtn = screen.getByTestId('confirm-delete');
    await user.click(confirmDeleteBtn);
    expect(handleZonesChanged).toHaveBeenCalledTimes(1);
    const modal = screen.getByTestId('delete-modal');
    expect(modal).toHaveAttribute('data-open', 'false');
  });

  test('saving an edit calls onZonesChanged and closes the modal', async () => {
    const user = userEvent.setup();
    const handleZonesChanged = jest.fn();
    render(<ExistingZones onZonesChanged={handleZonesChanged} />);
    await screen.findByText('Durban Port');
    const rows = screen.getAllByRole('row');
    const dbnRow = rows.find((r) => r.textContent.includes('Durban Port'));
    const buttons = dbnRow?.querySelectorAll('button') || [];
    const editBtn = buttons[0];
    await user.click(editBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const input = screen.getByTestId('edit-input');
    await user.clear(input);
    await user.type(input, 'Durban Port Updated');
    const saveBtn = screen.getByTestId('confirm-edit');
    await user.click(saveBtn);
    expect(handleZonesChanged).toHaveBeenCalledTimes(1);
    const modal = screen.getByTestId('edit-modal');
    expect(modal).toHaveAttribute('data-open', 'false');
  });
});