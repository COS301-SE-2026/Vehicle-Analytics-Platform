import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DemoLogin from '../pages/auth/DemoLogin';
import useAuthStore from '../store/authStore';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../components/AuthLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock('../store/authStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
  },
}));

function renderDemo(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/demo/:role" element={<DemoLogin />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DemoLogin', () => {
  const setUser = jest.fn();
  const setRole = jest.fn();
  const setToken = jest.fn();
  const getDashboardPath = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState.mockReturnValue({
      setUser,
      setRole,
      setToken,
      getDashboardPath,
    });
    global.fetch = jest.fn();
  });

  test('shows an error when the link has no code', async () => {
    renderDemo('/demo/viewer');

    expect(await screen.findByText('This demo link is invalid.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('rejects an unsupported demo role', async () => {
    renderDemo('/demo/admin?code=code');

    expect(await screen.findByText('This demo link is invalid.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('stores the returned user and navigates to the dashboard', async () => {
    getDashboardPath.mockReturnValue('/dashboard/manager');
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          idToken: 'demo-token',
          user: { id: 4, name: 'Manager', email: 'manager@example.com', role: 'fleet_manager' },
        },
      }),
    });

    renderDemo('/demo/manager?code=manager-code');

    await waitFor(() => {
      expect(setUser).toHaveBeenCalledWith({
        id: 4,
        name: 'Manager',
        email: 'manager@example.com',
      });
      expect(setRole).toHaveBeenCalledWith('fleet_manager');
      expect(setToken).toHaveBeenCalledWith('demo-token');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/manager', { replace: true });
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/demo-login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'manager-code', role: 'manager' }),
      }),
    );
  });

  test('displays the API error when demo sign-in fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid demo access link' }),
    });

    renderDemo('/demo/viewer?code=bad-code');

    expect(await screen.findByText('Invalid demo access link')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
