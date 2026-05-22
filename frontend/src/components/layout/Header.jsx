import PropTypes from 'prop-types'
import useAuthStore from '../../store/authStore'

export default function Header({ title, collapsed }) {
  const { user } = useAuthStore()
  const initials = (user?.name || 'User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className={`h-[60px] bg-fleet-surface border-b border-fleet-border fixed top-0 right-0 ${collapsed ? 'left-[64px]' : 'left-[220px]'} transition-all duration-300 z-10 flex items-center justify-between px-6`}>
      
      {/* Page Title */}
      <h1 className="font-display font-bold text-xl text-fleet-text">
        {title}
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-fleet-green flex items-center justify-center">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>
      </div>
    </header>
  )
}

Header.propTypes = {
  collapsed: PropTypes.bool,
  title:     PropTypes.string,
}
