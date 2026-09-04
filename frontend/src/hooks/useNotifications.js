import {useState, useEffect, useCallback, useRef} from 'react'
import useAuthStore from '@/store/authStore'
import { getNotifications } from '@/services/notificationsService'
import { getFleetGroups } from '@/services/fleetGroupService'
import { getVehiclesList } from '@/services/vehicleService'

const POLL_INTERVAL_MS = 30000
const MAX_MANAGER_LOG = 50

function readJSON(key, fallback) {
    try{
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
    }catch {
        return fallback
    }
}

function writeJSON(key, value){
    try{
        localStorage.setItem(key, JSON.stringify(value))
    }catch{
        //storage unavailable
    }
}

export function useNotifications() {
    const {user, role} = useAuthStore()
    const userId = user?.id || 'anon'

    const readKey = `vapor:notif:read:${userId}`
    const sinceKey = `vapor:notif:since:${userId}`
    const managerLogKey = `vapor:notif:managerLog:${userId}`


    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const readIdsRef = useRef(new Set(readJSON(readKey, ([]))))

    const persistRead = useCallback(() => {
        writeJSON(readKey, [...readIdsRef.current])
    }, [readKey])

    const markAsRead = useCallback((id) => {
        readIdsRef.current.add(id)
        persistRead()
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n,read: true} : n)))
    }, [persistRead])


    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => {
            prev.forEach((n) => readIdsRef.current.add(n.id))
            persistRead()
            return prev.map((n) => ({ ...n,read: true}))
        })
    }, [persistRead])  
    
    const fetchManagerNotifications = useCallback(async () => {
        const since = localStorage.getItem(sinceKey) || new Date(Date.now() - 7 *24*60*60*1000).toISOString()
        const {notifications: fresh, checkedAt} = await getNotifications(since)

        const freshItems = fresh.map((n) => ({
            id: `assignment-${n.id}`,
            type: n.action === 'ASSIGNED' ? 'group_assigned' : 'group_unassigned',
            message: n.message,
            timestamp: n.performed_at,
        }))

        const existingLog = readJSON(managerLogKey, [])
        const merged = [...freshItems, ...existingLog]
            .filter((n, idx, arr) => arr.findIndex((x) => x.id === n.id) === idx)
            .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, MAX_MANAGER_LOG)

        writeJSON(managerLogKey, merged)
        localStorage.setItem(sinceKey, checkedAt)

        return merged.map((n) => ({...n, read: readIdsRef.current.has(n.id) }))

    }, [sinceKey, managerLogKey])

    const fetchAdminNotifications = useCallback(async () => {
        const [groups, vehiclesRes] = await Promise.all([
            getFleetGroups(),
            getVehiclesList({limit: 500})
        ])

        const items = []

        for(const g of groups) {
            if(!g.assigned_managers || g.assigned_managers.length === 0) {
                const id = `group-no-manager-${g.id}`
                items.push({
                    id,
                    type: 'group_no_manager',
                    message: `Fleet group "${g.name}" has no manager assigned.`,
                    timestamp: null,
                })
            }
        }

        for (const v of vehiclesRes.vehicles || []){
            if(!v.fleet_group_id){
                const id = `vehicle-unassigned-${v.id}`
                items.push({
                    id,
                    type: 'vehicle_unassigned',
                    message: `Vehicle ${v.id} is not assigned to any fleet group.`,
                    timestamp: null,
                })
            }
        }

        return items.map((n) => ({ ...n, read: readIdsRef.current.has(n.id) }))
    }, [])

    const fetchNotifications = useCallback(async() => {
        if (!role){
            return
        }

        try{
            let items = []
            if(role === 'admin'){
                items = await fetchAdminNotifications()
            }else if (role == 'manager' ||role === 'fleet_manager'){
                items = await fetchManagerNotifications()
            }
            setNotifications(items)
        }catch(err){
            console.error('Failed to fetch notifications:', err)
        }finally{
            setLoading(false)
        }
    }, [role, fetchAdminNotifications, fetchManagerNotifications])



    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadCount = notifications.filter((n) => !n.read).length

    return {notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications}
}