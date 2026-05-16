import './AuthLayout.css';

const vehicles = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  status: i === 4 ? 'warning' : i === 9 ? 'offline' : 'active',
}));

export default function AuthLayout({ children }) {
  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="auth-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="6" width="18" height="10" rx="2" fill="white" fillOpacity="0.9"/>
            <rect x="4" y="3" width="5" height="4" rx="1" fill="white" fillOpacity="0.6"/>
            <circle cx="5" cy="17" r="2" fill="#2D5016"/>
            <circle cx="15" cy="17" r="2" fill="#2D5016"/>
          </svg>
          <span>FleetTracker</span>
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