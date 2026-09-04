import {Bell, X, UserPlus, UserMinus, Users, Car} from 'lucide-react'
import PropTypes from 'prop-types'
import { formatDistanceToNow } from "date-fns";

import {Button} from '../ui/button'

import {useNotifications} from '@/hooks/useNotifications'
import {cn} from '@/lib/utils'

const ICONS = {
    group_assigned: UserPlus,
    group_unassigned: UserMinus,
    group_no_manager: Users,
    vehicle_unassigned: Car,
}

export default function NotificationBell({isOpen, onOpen, onClose}) {
    const {notifications, unreadCount, loading, markAsRead, markAllAsRead} = useNotifications()

    return(
        <>
                <button
                    type="button"
                    onClick={onOpen}
                    aria-label="Open notifications"
                    className="relative h-8 w-8 flex items-center justify-center bg-fleet-blue rounded-full text-fleet-surface hover:text-fleet-surface/80 transition-colors">
                        <Bell className="w-5 h-5"></Bell>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-fleet-alert text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-fleet-surface">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                </button>

          {/* Backdrop */}
          <button
           type="button"
           aria-label="Dismiss notifications panel"
           tabIndex={isOpen ? 0 : - 1}
           onClick={onClose}
           className={cn("fixed inset-0 bg-fleet-blue/20 transition-opacity duration-200 z-40",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
           )}
          />

           {/* Panel */}
           <dialog
             data-testid="notifications-panel"
             aria-label="Notifications"
             className={cn("fixed top-0 right-0 left-auto bottom-auto m-0 max-w-none max-h-none", 
                "h-full w-full sm:w-[380px] bg-fleet-surface shadow-xl z-50",
                "flex flex-col transition-transform duration-200 ease-out",
                isOpen ? "translate-x-0" : "translate-x-full"
           )}
            open={isOpen}
            inert={!isOpen}
           >

           {/* Header */}
           <div className='flex items-center justify-between px-4 py-3 border-b border-fleet-secondary'>
             <h1 className='text-xl font-bold text-fleet-blue'>Notifications</h1>
             <Button
              onClick={onClose}
              className='text-fleet-surface bg-fleet-blue hover:bg-fleet-blue/80 transition-colors'
              aria-label="Close notifications panel"
             >
                <X size={18}/>
             </Button>
           </div>

                        {unreadCount > 0 && (
                            <div className="px-4 py-3 flex justify-end">
                            <button 
                                type="button"
                                onClick={markAllAsRead}
                                className="text-sm text-fleet-blue hover:text-fleet-blue/80 font-medium transition-colors">
                                    Mark all as read
                                </button>
                            </div>
                        )}

                    <div className="flex-1 overflow-y-auto px-4 py-2">
                        {loading ? (
                            <div className="text-sm text-fleet-secondary/70 py-6 text-center">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-sm text-fleet-secondary/70 py-6 text-center">
                                You&apos;re all caught up!
                            </div>
                        ) : (
                            <ul className="divide-y divide-fleet-secondary/20">
                                {notifications.map((n) => {
                                    const Icon = ICONS[n.type] || Bell

                                    return (
                                        <li key={n.id}>
                                            <button
                                                type="button"
                                                onClick={() => markAsRead(n.id)}
                                                className="w-full flex items-start gap-3 py-3 text-left hover:bg-fleet-idle/10 transition-colors">
                                                    <Icon
                                                        size={16}
                                                        className={cn('shrink-0 mt-0.5', n.read ? 'text-fleet-secondary/60' : 'text-fleet-blue')}>
                                                    </Icon>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn('text-sm', n.read ? 'text-fleet-secondary' : 'text-fleet-secondary font-medium')}>
                                                            {n.message}
                                                        </p>

                                                    {n.timestamp && (
                                                        <p className="text-xs text-fleet-secondary/60 mt-0.5">
                                                            {formatDistanceToNow(new Date(n.timestamp), {addSuffix: true})}
                                                        </p>
                                                    )}
                                                    </div>
                                                {!n.read &&(
                                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-fleet-blue shrink-0">
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                    </dialog>
                    </>
    )
}

NotificationBell.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onOpen: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
}