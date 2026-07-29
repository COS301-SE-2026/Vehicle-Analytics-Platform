import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import * as vehicleService from '../../../services/vehicleService';
import '@testing-library/jest-dom';

jest.mock('../../../services/vehicleService');



const renderWithRouter = (ui) => {
    return render(<BrowserRouter>  {ui} 
    </BrowserRouter>);
};


describe('AdminDashboard Integration', () => {
    const mockUsers = {
        users: [
            {id: 'u1', name: 'Thabo Admin', role: 'admin', email: 'thabo@admin.com' },
            { id: 'u2', name: 'Doe Viewer', role: 'viewer', email: 'doe@viewer.com' }
        ]
    };

    const mockKPIs = {
        totalVehicles: 50, active_vehicles: 12, alertsToday: 5, distanceToday: 1388,
        lastUpdated: new Date().toISOString()
    };

    const mockLocations = {
        timestamp: new Date().toISOString(),
        vehicles: [ { id: 'v1', status: 'active', distanceToday: 100 }, { id: 'v2', status: 'idle', distanceToday: 0 },
            { id: 'v3', status: 'offline', distanceToday: 0 }]
    };
    
    const mockAlerts = {
        total: 1,
        alerts: [
            { id: 'a1', vehicle_id: 'v1', type: 'SPEEDING', message: 'Exceeded 120km/h', timestamp: new Date().toISOString() }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks(); 

        vehicleService.getUsers.mockResolvedValue(mockUsers);
        vehicleService.getKPIs.mockResolvedValue(mockKPIs);
        vehicleService.getVehicleLocations.mockResolvedValue(mockLocations);
        vehicleService.getAlerts.mockResolvedValue(mockAlerts);
        vehicleService.getActivityHistory.mockResolvedValue([]);
    });

    test('renders loading state initially, then displays dashboard data', async () => {renderWithRouter(<AdminDashboard />);
        
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        await waitFor(() => { expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
        });


        expect(screen.getByText('Active Vehicles')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();

        expect(screen.getByText('Total Distance Today')).toBeInTheDocument();
        expect(screen.getByText('1488 km')).toBeInTheDocument();
        // user management works correctly
        expect(screen.getByText('Registered Users')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText(/1 Admin - 0 Mgr - 1 Viewer/i)).toBeInTheDocument();
    
    });

    test('executes the user deactivation successfulty', async () => {
        vehicleService.deleteUser.mockResolvedValue({ success: true});
        renderWithRouter(<AdminDashboard/>);

        await waitFor(() => { expect(screen.getByText('Thabo Admin')).toBeInTheDocument(); });

        const row = screen.getByText('Thabo Admin').closest('tr');
        const deactivateButton = within(row).getByRole('button', {name: /deactivate/i });


        await userEvent.click(deactivateButton);

        const modal = await screen.findByRole('dialog');
        expect(modal).toBeInTheDocument();
        const confirmButton = within(modal).getByRole('button', { name: /confirm/i});
        await userEvent.click(confirmButton);

        expect(vehicleService.deleteUser).toHaveBeenCalledWith('u1');


        await waitFor(() => {
            expect(screen.queryByText('Thabo Admin')).not.toBeInTheDocument();
        });
    });

    test('here we will handle APi failures during initial load' , async () => {
        vehicleService.getKPIs.mockRejectedValue(new Error ('Network error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        renderWithRouter(<AdminDashboard/>);
        await waitFor( () => { expect(screen.getByText('No data available')).toBeInTheDocument(); 
        });
        consoleSpy.mockRestore();
    });

});

