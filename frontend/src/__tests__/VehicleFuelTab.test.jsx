import { render, screen, waitFor } from '@testing-library/react';
import VehicleFuelTab from '../components/vehicles/VehicleFuelTab';
import * as fuelService from '../services/fuelService';

jest.mock('../services/fuelService', () => ({
  getVehicleFuelHistory: jest.fn(),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('VehicleFuelTab Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty state when no data is available', async () => {
    fuelService.getVehicleFuelHistory.mockResolvedValueOnce([]);

    render(<VehicleFuelTab vehicleId="1001" />);

    await waitFor(() => {
      expect(screen.getByText('No Fuel Data Yet')).toBeInTheDocument();
      expect(screen.getByText(/Vehicle 1001/i)).toBeInTheDocument();
    });
  });
});
