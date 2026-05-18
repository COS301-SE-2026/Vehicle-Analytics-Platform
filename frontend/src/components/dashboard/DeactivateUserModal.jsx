import { useEffect } from "react";
import PropTypes from 'prop-types';

export default function DeactivateUserModal({ isOpen, user, onConfirm, onCancel }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => e.key === "Escape" && onCancel();
    globalThis.addEventListener("keydown", handleKey);
    return () =>globalThis.addEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !user) return null;

  return (
    // Backdrop
    <div
      className="du-backdrop"
      aria-hidden="true"
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
  <div
      className="du-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="du-title"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal card – stop click propagation so clicking inside doesn't close */}
      <div className="du-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="du-header">
          <h2 id="du-title" className="du-heading">Deactivate User</h2>
          <button className="du-close" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <hr className="du-divider" />

        {/* Warning icon */}
        <div className="du-icon-wrap">
          <span className="du-icon" aria-hidden="true">⚠</span>
        </div>

        {/* Body copy */}
        <p className="du-question">Are you sure?</p>
        <p className="du-body">
          You are about to deactivate the account for <strong>{user.name}</strong>.
          This user will lose access to FleetTracker immediately and will not be able
          to log in until reactivated.
        </p>

        {/* Info banner */}
        <div className="du-info-banner">
          The user account will be preserved and can be reactivated at any time by an Admin.
        </div>

        <hr className="du-divider" />

        {/* Actions */}
        <div className="du-actions">
          <button className="du-btn du-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="du-btn du-btn-confirm" onClick={() => onConfirm(user)}>
            Yes, Deactivate
          </button>
        </div>
      </div>

      {/* Scoped styles */}
      <style>{`
        .du-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: du-fade-in 0.15s ease;
        }

        @keyframes du-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .du-card {
          background: #ffffff;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          animation: du-slide-up 0.2s ease;
        }

        @keyframes du-slide-up {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Header */
        .du-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .du-heading {
          font-size: 17px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .du-close {
          background: none;
          border: none;
          font-size: 16px;
          color: #6b7280;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .du-close:hover { background: #f3f4f6; color: #111827; }

        /* Divider */
        .du-divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 0 -28px;
        }

        /* Icon */
        .du-icon-wrap {
          display: flex;
          justify-content: center;
          margin: 24px 0 12px;
        }

        .du-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #d97706;
          color: #ffffff;
          font-size: 26px;
          line-height: 1;
        }

        /* Body */
        .du-question {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 10px;
        }

        .du-body {
          text-align: center;
          font-size: 14px;
          color: #374151;
          line-height: 1.55;
          margin: 0 0 16px;
        }

        .du-body strong { color: #111827; }

        /* Info banner */
        .du-info-banner {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          color: #c2410c;
          font-size: 13.5px;
          line-height: 1.5;
          padding: 12px 14px;
          margin-bottom: 20px;
          text-align: center;
        }

        /* Actions */
        .du-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          padding-top: 16px;
        }

        .du-btn {
          padding: 10px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }

        .du-btn:active { transform: scale(0.97); }

        .du-btn-cancel {
          background: #ffffff;
          border-color: #d1d5db;
          color: #374151;
        }
        .du-btn-cancel:hover { background: #f9fafb; border-color: #9ca3af; }

        .du-btn-confirm {
          background: #b91c1c;
          color: #ffffff;
        }
        .du-btn-confirm:hover { background: #991b1b; }
      `}</style>
    </div>
  </div>
  );
}

DeactivateUserModal.propTypes = {
  isOpen:    PropTypes.bool,
  user:      PropTypes.shape({
    name: PropTypes.string,
  }),
  onConfirm: PropTypes.func,
  onCancel:  PropTypes.func,
}