import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {RefreshCw, Plus} from 'lucide-react'
import { createFleetGroup, getFleetGroups } from "@/services/fleetGroupService";
import CreateFleetGroupModal from "@/components/dashboard/CreateFleetGroupModal";
import FleetGroupsTable from "@/components/dashboard/FleetGroupsTable";

export default function FleetGroupsManagement() {
    const navigate = useNavigate()
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState(null)
    const [createOpen, setCreateOpen] = useState(false)

    const fetchAll = useCallback(async () => {
        try{
            const fleetGroups = await getFleetGroups()
                setGroups(fleetGroups)
                setErrorMsg(null)
            
        }catch (err) {
            console.error('Failed to fetch fleet groups:', err)
            setErrorMsg('Failed to load fleet groups. Please try again.')
        }finally{
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])



    async function handleCreate(name, description) {
        const group = await createFleetGroup(name, description)
        setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)))
    }


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-fleet-text text-xl">
                    Fleet Groups
                </h1>
                <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 text-sm bg-fleet-blue text-white px-3 py-2 rounded-lg font-medium hover:bg-fleet-blue/90 transition-colors">
                        <Plus className="w-4 h-4"></Plus>
                        New Group
                    </button>      
                <button
                    type="button"
                    onClick={fetchAll}
                    className="inline-flex items-center gap-2 text-xs text-fleet-secondary hover:text-fleet-text transition-colors font-medium">
                        <RefreshCw className="w-3.5 h-3.5"></RefreshCw>
                        Refresh
                    </button>
            </div>
                </div>


            {errorMsg && (
                <div className="bg-fleet-alert/10 text-fleet-alert text-sm rounded-lg p-3">
                    {errorMsg}
                </div>
            )}

            {loading ? (
                <div className="bg-fleet-surface rounded-xl border border-fleet-border p-8 text-center text-fleet-secondary text-sm">
                    Loading fleet groups...
                </div>
            ) : (
                <FleetGroupsTable groups={groups} onManage={(group) => navigate(`/fleet-groups/${group.id}`)}></FleetGroupsTable>
            )}

            <CreateFleetGroupModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={handleCreate}></CreateFleetGroupModal>
        </div>
    )
}