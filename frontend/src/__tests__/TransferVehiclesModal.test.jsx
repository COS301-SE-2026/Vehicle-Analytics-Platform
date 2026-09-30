import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransferVehiclesModal from '@/components/fleetgroups/TransferVehiclesModal';

function renderModal(props = {}) {
    const defaults = {
        open: true,
        onOpenChange: jest.fn(),
        vehicleIds: ['1043'],
        fromName: 'Gauteng Group',
        toName: 'Eastern Cape',
        onConfirm: jest.fn(),
    };

    const merged = { ...defaults, ...props};
    render(<TransferVehiclesModal { ...merged} />);
    return merged;
}

describe('TransferVehiclesModal', () => {
    it('renders nothing when closed', () => {
        renderModal({ open: false});
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('names a single vehicle and both groups', () => {
        renderModal();
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toHaveTextContent('Transfer Vehicles');
        expect(dialog).toHaveTextContent('Move vehicle 1043 from Gauteng Group to Eastern Cape?');
        expect(dialog).toHaveTextContent("follow Eastern Cape's alert rules and manager");
    });

    it('shows a count when many vehicles are selected', () => {
        renderModal({ vehicleIds: ['1000', '1001', '1002', '1003', '1004'] });
        expect(screen.getByRole('alertdialog')).toHaveTextContent('Move 5 vehicles from Gauteng Group');
    });

    it('calls onConfirm when Transfer is clicked', async () => {
        const user = userEvent.setup();
        const props = renderModal();

        await user.click(screen.getByRole('button', { name: 'Transfer' }));

        expect(props.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('closes without confirming when Cancel is clicked', async () => {
        const user = userEvent.setup();
        const props = renderModal();

        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(props.onOpenChange).toHaveBeenCalledWith(false);
        expect(props.onConfirm).not.toHaveBeenCalled();
    });
});