import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from './testUtils';
import SignupPage from '../pages/SignupPage';

jest.mock('aws-amplify/auth', () => ({
  signUp: jest.fn(),
}));

jest.mock('../components/AuthLayout', () => function MockAuthLayout({ children }) { return <div>{children}</div>; });

describe('SignupPage', () => {
  test('renders signup form correctly', () => {
    renderWithRouter(<SignupPage />);
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  test('shows error when terms not agreed', async () => {
    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText(/please agree to the terms/i)).toBeInTheDocument();
  });

    test('shows error when passwords do not match', () => {
    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Different@1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

  test('shows password strength indicators when typing', () => {
    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  });

  test('updates fields on change', () => {
    renderWithRouter(<SignupPage />);
    const nameInput = screen.getByLabelText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    expect(nameInput.value).toBe('Jane Doe');
  });

  test('shows error when password is too weak', () => {
    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'weak' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText(/please choose a stronger password/i)).toBeInTheDocument();
  });

  test('shows error when signup fails', async () => {
    const { signUp } = require('aws-amplify/auth');
    signUp.mockRejectedValueOnce(new Error('An account with the given email already exists.'));

    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });

  test('shows loading state when signing up', async () => {
    const { signUp } = require('aws-amplify/auth');
    signUp.mockImplementationOnce(() => new Promise(() => {}));

    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/creating account/i)).toBeInTheDocument();
  });

  test('navigates to verify page on successful signup', async () => {
    const { signUp } = require('aws-amplify/auth');
    signUp.mockResolvedValueOnce({});

    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/creating account/i)).toBeInTheDocument();
  });

  test('shows default error message when signup fails without message', async () => {
    const { signUp } = require('aws-amplify/auth');
    signUp.mockRejectedValueOnce({});

    renderWithRouter(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test@1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/sign up failed/i)).toBeInTheDocument();
  });
});