const ROLE_STYLES = {
  admin: 'bg-fleet-alert text-white',
  manager: 'bg-fleet-green text-white',
  viewer: 'bg-fleet-idle text-white',
}

const ROLE_LABELS = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  viewer: 'VIEWER',
}

export default function UserManagementTable({ users = [], onEdit, onDeactivate, onActivate }) {
  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-fleet-text text-base">
          User Management
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-fleet-secondary text-xs uppercase tracking-wide border-b border-fleet-border">
              <th className="text-left pb-3 font-medium">Name</th>
              <th className="text-left pb-3 font-medium">Email</th>
              <th className="text-left pb-3 font-medium">Role</th>
              <th className="text-left pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fleet-border">
            {users.map((user) => {
              const isAdmin = user.role === 'admin'
              const isInactive = user.status === 'inactive'

              return (
                <tr key={user.id} className="hover:bg-fleet-bg transition-colors">
                  
                  {/* Name */}
                  <td className="py-3">
                    <span className="font-medium text-fleet-text">
                      {user.name}
                    </span>
                  </td>

                  {/* Email */}
                  <td className="py-3">
                    <span className="font-mono text-xs text-fleet-secondary">
                      {user.email}
                    </span>
                  </td>

                  {/* Role Badge */}
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${ROLE_STYLES[user.role] ?? 'bg-fleet-idle text-white'}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isInactive ? 'bg-fleet-idle' : 'bg-fleet-green'}`} />
                      <span className={`text-xs ${isInactive ? 'text-fleet-idle' : 'text-fleet-text'}`}>
                        {isInactive ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2 text-fleet-idle">
                        <span className="text-xs">—</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onEdit(user)}
                          className="text-xs text-fleet-secondary hover:text-fleet-text transition-colors font-medium"
                        >
                          Edit
                        </button>
                        {isInactive ? (
                          <button
                            onClick={() => onActivate(user)}
                            className="text-xs text-fleet-green hover:text-fleet-green/80 transition-colors font-medium"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            onClick={() => onDeactivate(user)}
                            className="text-xs text-fleet-alert hover:text-fleet-alert/80 transition-colors font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-fleet-secondary text-sm">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-xs text-fleet-secondary mt-4 italic">
        Role changes take effect on the affected users next login.
      </p>
    </div>
  )
}