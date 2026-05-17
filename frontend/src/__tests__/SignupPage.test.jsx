import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignupPage from '../pages/SignupPage';

jest.mock('aws-amplify/auth', () => ({
  signUp: jest.fn(),
}));

jest.mock('../components/AuthLayout', () => ({ children }) => <div>{children}</div>);

describe('SignupPage', () => {
  test('renders signup form correctly', () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  test('shows error when terms not agreed', async () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText(/please agree to the terms/i)).toBeInTheDocument();
  });

    test('shows error when passwords do not match', () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Different@1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

  test('shows password strength indicators when typing', () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  });

  test('updates fields on change', () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    const nameInput = screen.getByLabelText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    expect(nameInput.value).toBe('Jane Doe');
  });
});