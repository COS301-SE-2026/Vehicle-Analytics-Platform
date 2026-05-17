import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyPage from '../pages/VerifyPage';

jest.mock('aws-amplify/auth', () => ({
  confirmSignUp: jest.fn(),
  resendSignUpCode: jest.fn(),
}));

jest.mock('../components/AuthLayout', () => ({ children }) => <div>{children}</div>);

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
});