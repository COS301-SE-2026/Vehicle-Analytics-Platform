import { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import useAuthStore from '../../store/authStore'
import { CircleQuestionMark } from 'lucide-react'
import { HelpPanel } from '@/components/help/HelpPanel';
import NotificationBell from './NotificationBell';

export default function Header({ title, collapsed }) {
  const [ activePanel, setActivePanel ] = useState(false);
  const { user } = useAuthStore()
  const initials = (user?.name || 'User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

    const openHelp = useCallback(() => setActivePanel('help'), []);
    const closeHelp = useCallback(() => setActivePanel(null), []);
    const openNotifications = useCallback(() => setActivePanel('notifications'), []);
    const closeNotifications = useCallback(() => setActivePanel(null), []);

  return (
    <header className={`h-[60px] bg-fleet-surface border-b border-fleet-border fixed top-0 right-0 ${collapsed ? 'left-[64px]' : 'left-[220px]'} transition-all duration-300 z-10 flex items-center justify-between px-6`}>
      
      {/* Page Title */}
      <h1 className="font-display font-bold text-xl text-fleet-blue">
        {title}
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        <NotificationBell
          isOpen={activePanel === 'notifications'}
          onOpen={openNotifications}
          onClose={closeNotifications}
        />

        <button
          type="button"
          onClick={openHelp}
          aria-label="Open help"
          className="h-8 w-8 flex items-center justify-center bg-fleet-blue rounded-full text-fleet-surface hover:text-fleet-surface/80 transition-colors"
        >
          <CircleQuestionMark className="w-6 h-6"/>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-fleet-blue flex items-center justify-center">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>
      </div>

      <HelpPanel
        isOpen={activePanel === 'help'}
        onClose={closeHelp}
        role={user?.role || 'viewer'}
      />
    </header>
  )
}

Header.propTypes = {
  collapsed: PropTypes.bool,
  title:     PropTypes.string,
}
