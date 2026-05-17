import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

jest.mock('aws-amplify/auth', () => ({
  signIn: jest.fn(),
}));

jest.mock('../components/AuthLayout', () => function MockAuthLayout({ children }) { return <div>{children}</div>; });

describe('LoginPage', () => {
  test('renders login form correctly', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to dashboard/i })).toBeInTheDocument();
  });

  test('shows error when fields are empty and submitted', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /sign in to dashboard/i }));
    expect(screen.queryByText(/sign in failed/i)).not.toBeInTheDocument();
  });

  test('updates email field on change', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  test('updates password field on change', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'Test@1234' } });
    expect(passwordInput.value).toBe('Test@1234');
  });

  test('toggles password visibility', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const passwordInput = screen.getByLabelText('Password');
    const toggleBtn = screen.getByLabelText('Toggle password');
    expect(passwordInput.type).toBe('password');
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');
  });

  test('shows error message when sign in fails', async () => {
    const { signIn } = require('aws-amplify/auth');
    signIn.mockRejectedValueOnce(new Error('Incorrect username or password.'));

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Wrong@1234' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to dashboard/i }));

    expect(await screen.findByText(/incorrect username or password/i)).toBeInTheDocument();
  });

  test('shows loading state when signing in', async () => {
    const { signIn } = require('aws-amplify/auth');
    signIn.mockImplementationOnce(() => new Promise(() => {}));

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to dashboard/i }));

    expect(await screen.findByText(/signing in/i)).toBeInTheDocument();
  });

  test('navigates to dashboard on successful sign in', async () => {
    const { signIn } = require('aws-amplify/auth');
    signIn.mockResolvedValueOnce({ isSignedIn: true });

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in to dashboard/i }));

    await screen.findByText(/signing in/i);
  });
});