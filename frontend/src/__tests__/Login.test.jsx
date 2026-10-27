import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/auth/Login';
import useAuthStore from '../store/authStore';

jest.mock('../store/authStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    useAuthStore.getState.mockReturnValue({
      setUser: jest.fn(),
      setRole: jest.fn(),
      setToken: jest.fn(),
      getDashboardPath: jest.fn().mockReturnValue('/dashboard'),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    // Use getByPlaceholderText for email since there might be multiple labels
    expect(screen.getByPlaceholderText('manager@fleet.com')).toBeInTheDocument();
    // Target the password input specifically by ID
    expect(document.getElementById('password')).toBeInTheDocument();
  });

  it('shows an error when login fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    render(<BrowserRouter><Login /></BrowserRouter>);

    fireEvent.change(screen.getByPlaceholderText('manager@fleet.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(document.getElementById('password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in to dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('navigates to the dashboard on successful login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          user: { id: '1', name: 'Test User', email: 'test@test.com', role: 'fleet_manager' },
          idToken: 'fake-token',
        },
      }),
    });

    render(<BrowserRouter><Login /></BrowserRouter>);

    fireEvent.change(screen.getByPlaceholderText('manager@fleet.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(document.getElementById('password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in to dashboard/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
