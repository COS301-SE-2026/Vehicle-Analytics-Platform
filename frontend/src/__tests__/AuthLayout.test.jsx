import { render, screen } from '@testing-library/react';
import AuthLayout from '../components/AuthLayout';

describe('AuthLayout', () => {
  test('renders children correctly', () => {
    render(<AuthLayout><div>Test Child</div></AuthLayout>);
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  test('renders logo text', () => {
    render(<AuthLayout><div>Test</div></AuthLayout>);
    expect(screen.getByText('V.A.P.O.R')).toBeInTheDocument();
  });

  test('renders fleet status section', () => {
    render(<AuthLayout><div>Test</div></AuthLayout>);
    expect(screen.getByText('LIVE FLEET STATUS')).toBeInTheDocument();
  });

  test('renders stats section', () => {
    render(<AuthLayout><div>Test</div></AuthLayout>);
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Updates')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });
});