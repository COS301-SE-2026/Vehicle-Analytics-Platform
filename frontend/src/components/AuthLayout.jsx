import './AuthLayout.css';
import PropTypes from 'prop-types';

const getStatus = (index) => {
  if (index === 4) return 'warning';
  if (index === 9) return 'offline';
  return 'active';
};

const vehicles = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  status: getStatus(i),
}));

export default function AuthLayout({ children }) {
  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="auth-logo">
          <span>V.A.P.O.R</span>
        </div>

        <div className="auth-hero">
          <h1>Monitor every vehicle. Every second.</h1>
        </div>

        <div className="auth-fleet-status">
          <p className="fleet-label">LIVE FLEET STATUS</p>
          <div className="fleet-grid">
            {vehicles.map((v) => (
              <div key={v.id} className={`fleet-tile fleet-tile--${v.status}`} />
            ))}
          </div>
        </div>

        <div className="auth-stats">
          <div className="auth-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="stat-num">15</span>
            <span className="stat-label">Vehicles</span>
          </div>
          <div className="auth-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="stat-num">5s</span>
            <span className="stat-label">Updates</span>
          </div>
          <div className="auth-stat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="stat-num">24/7</span>
            <span className="stat-label">Monitoring</span>
          </div>
        </div>
      </div>

      <div className="auth-right">
        {children}
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};