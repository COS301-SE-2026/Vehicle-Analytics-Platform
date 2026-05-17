import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PropTypes from 'prop-types';

export function renderWithRouter(component) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

export function VerifyPageWrapper({ children }) {
  return (
    <MemoryRouter initialEntries={[{ pathname: '/verify', state: { email: 'test@example.com' } }]}>
      <Routes>
        <Route path="/verify" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

VerifyPageWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};