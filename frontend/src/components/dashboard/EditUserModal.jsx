import { useState } from 'react'
import { X } from 'lucide-react'

const ROLES = [
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only data access',
    color: 'bg-fleet-idle',
  },
  {
    value: 'manager',
    label: 'Fleet Manager',
    description: 'Vehicle and trip management',
    color: 'bg-fleet-green',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full system and user control',
    color: 'bg-fleet-alert',
  },
]

export default function EditUserModal({ user, onClose, onSave }) {
  const [selectedRole, setSelectedRole] = useState(user?.role ?? 'viewer')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const isAdminSelected = selectedRole === 'admin'

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(user, selectedRole)
      onClose()
    } catch (error) {
      console.error('Save role error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-fleet-text/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-fleet-surface rounded-2xl border border-fleet-border w-full max-w-[440px] shadow-lg">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-fleet-border">
            <h2 className="font-display font-bold text-fleet-text text-lg">
              Edit User Access
            </h2>
            <button
              onClick={onClose}
              className="text-fleet-secondary hover:text-fleet-text transition-colors p-1 rounded-lg hover:bg-fleet-panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-fleet-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-fleet-green flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {initials}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-fleet-text text-sm">
                    {user.name}
                  </p>
                  <p className="font-mono text-xs text-fleet-secondary">
                    {user.email}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-fleet-idle text-white">
                {user.role}
              </span>
            </div>
          </div>

          {/* Role Selector */}
          <div className="px-6 py-4">
            <label className="text-xs uppercase tracking-wide font-medium text-fleet-secondary block mb-3">
              Assign New Role
            </label>

            {/* Dropdown */}
            <div className="relative mb-4">
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="w-full h-10 px-3 pr-8 border border-fleet-border rounded-lg bg-fleet-surface text-fleet-text text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:border-fleet-green transition-colors"
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-fleet-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Role descriptions */}
            <div className="flex flex-col gap-2 mb-4">
              {ROLES.map(role => (
                <div
                  key={role.value}
                  className={`flex items-center gap-2 text-xs cursor-pointer ${selectedRole === role.value ? 'text-fleet-text font-medium' : 'text-fleet-secondary'}`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <span className={`w-2 h-2 rounded-full ${role.color} shrink-0`} />
                  <span className="font-medium">{role.label}</span>
                  <span className="text-fleet-secondary">({role.description})</span>
                </div>
              ))}
            </div>

            {/* Admin Warning */}
            {isAdminSelected && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <svg className="w-4 h-4 text-fleet-alert shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-fleet-alert">
                  This user will have full system access including user management and the ability to modify other accounts.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-10 border border-fleet-border rounded-lg text-sm text-fleet-text hover:bg-fleet-panel transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedRole === user.role}
                className="flex-1 h-10 bg-fleet-green text-white rounded-lg text-sm font-medium hover:bg-fleet-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            <p className="text-xs text-fleet-secondary text-center">
              Role changes take effect on the affected users next login.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}