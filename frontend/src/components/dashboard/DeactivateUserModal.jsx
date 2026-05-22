import { useEffect, useRef } from "react";
import { X, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';

export default function DeactivateUserModal({ isOpen, user, onConfirm, onCancel }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return

    if (isOpen) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
      d.focus()
    } else if (typeof d.close === 'function') {
      d.close()
    } else {
      d.removeAttribute('open')
    }

    return () => {
      if (d) {
        if (typeof d.close === 'function') d.close()
        else d.removeAttribute('open')
      }
    }
  }, [isOpen])

  if (!isOpen || !user) return null;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      aria-labelledby="du-title"
      onCancel={(e) => { e.preventDefault(); onCancel() }}
    >
      <div className="bg-fleet-surface rounded-2xl border border-fleet-border w-full max-w-[440px] shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-fleet-border">
          <h2 id="du-title" className="font-display font-bold text-fleet-text text-lg">
            Deactivate User
          </h2>
          <button
            onClick={onCancel}
            className="text-fleet-secondary hover:text-fleet-text transition-colors p-1 rounded-lg hover:bg-fleet-panel"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-fleet-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-fleet-alert flex items-center justify-center shrink-0" aria-hidden>
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
              <div>
                <p className="font-medium text-fleet-text text-sm">{user.name}</p>
                <p className="font-mono text-xs text-fleet-secondary">{user.email}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-fleet-idle text-white">
              {user.role}
            </span>
          </div>
        </div>

        {/* Warning Body */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-fleet-alert" strokeWidth={2} />
            </div>
            <div>
              <p className="font-medium text-fleet-text text-sm mb-1">Are you sure?</p>
              <p className="text-sm text-fleet-secondary leading-relaxed">
                You are about to Deactivate the account for{' '}
                <span className="font-medium text-fleet-text">{user.name}</span>.
                This user will lose access to V.A.P.O.R. immediately and will not be
                able to log in again.
              </p>
            </div>
          </div>

          {/* Permanent action banner */}
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <svg className="w-4 h-4 text-fleet-alert shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-fleet-alert">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-10 border border-fleet-border rounded-lg text-sm text-fleet-text hover:bg-fleet-panel transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(user)}
              className="flex-1 h-10 bg-fleet-alert text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Yes, Deactivate
            </button>
          </div>
          <p className="text-xs text-fleet-secondary text-center">
            This will immediately revoke all access for this user.
          </p>
        </div>

      </div>
    </dialog>
  );
}

DeactivateUserModal.propTypes = {
  isOpen:    PropTypes.bool,
  user:      PropTypes.shape({
    name:  PropTypes.string,
    email: PropTypes.string,
    role:  PropTypes.string,
  }),
  onConfirm: PropTypes.func,
  onCancel:  PropTypes.func,
}