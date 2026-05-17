import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyPage from '../pages/VerifyPage';

jest.mock('aws-amplify/auth', () => ({
  confirmSignUp: jest.fn(),
  resendSignUpCode: jest.fn(),
}));

jest.mock('../components/AuthLayout', () => function MockAuthLayout({ children }) { return <div>{children}</div>; });

const renderVerifyPage = () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/verify', state: { email: 'test@example.com' } }]}>
      <Routes>
        <Route path="/verify" element={<VerifyPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('VerifyPage', () => {
  test('renders verify page correctly', () => {
    renderVerifyPage();
    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    expect(screen.getByText(/we sent a 6-digit code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify account/i })).toBeInTheDocument();
  });

  test('renders 6 code input boxes', () => {
    renderVerifyPage();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  test('shows error when code is incomplete', () => {
    renderVerifyPage();
    fireEvent.click(screen.getByRole('button', { name: /verify account/i }));
    expect(screen.getByText(/please enter all 6 digits/i)).toBeInTheDocument();
  });

  test('fills code input on change', () => {
    renderVerifyPage();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '1' } });
    expect(inputs[0].value).toBe('1');
  });

  test('shows countdown timer', () => {
    renderVerifyPage();
    expect(screen.getByText(/code expires in/i)).toBeInTheDocument();
  });

  test('shows resend code link', () => {
    renderVerifyPage();
    expect(screen.getByText(/resend code/i)).toBeInTheDocument();
  });

  test('shows error when verification fails', async () => {
    const { confirmSignUp } = require('aws-amplify/auth');
    confirmSignUp.mockRejectedValueOnce(new Error('Invalid verification code provided.'));

    renderVerifyPage();
    const inputs = screen.getAllByRole('textbox');
    ['1','2','3','4','5','6'].forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });
    fireEvent.click(screen.getByRole('button', { name: /verify account/i }));
    expect(await screen.findByText(/invalid verification code/i)).toBeInTheDocument();
  });

  test('shows loading state when verifying', async () => {
    const { confirmSignUp } = require('aws-amplify/auth');
    confirmSignUp.mockImplementationOnce(() => new Promise(() => {}));

    renderVerifyPage();
    const inputs = screen.getAllByRole('textbox');
    ['1','2','3','4','5','6'].forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });
    fireEvent.click(screen.getByRole('button', { name: /verify account/i }));
    expect(await screen.findByText(/verifying/i)).toBeInTheDocument();
  });

  test('shows success message after resend', async () => {
    const { resendSignUpCode } = require('aws-amplify/auth');
    resendSignUpCode.mockResolvedValueOnce({});

    renderVerifyPage();
    fireEvent.click(screen.getByText(/resend code/i));
    expect(await screen.findByText(/code resent successfully/i)).toBeInTheDocument();
  });

  test('handles backspace to go to previous input', () => {
    renderVerifyPage();
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '1' } });
    fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    expect(inputs[0]).toHaveFocus();
  });
});