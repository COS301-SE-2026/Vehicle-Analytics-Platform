import {useState, useRef, useEffect} from 'react'
import {X} from 'lucide-react'
import PropTypes from 'prop-types'

export default function CreateFleetGroupModal({ open, onClose, onCreate}) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState(null)
    const dialogRef = useRef(null)

    useEffect(() => {
        const d = dialogRef.current
        if(!d) {
            return
        }

        if(open) {
            setName('')
            setDescription('')
            setErrorMsg(null)

            if(typeof d.showModal === 'function'){
                d.showModal()
            }else{
                d.setAttribute('open', '')
            }
            d.focus()
        }else if(typeof d.close === 'function'){
            d.close()
        }else{
            d.removeAttribute('open')
        }

        return() => {
            if(d){
                if(typeof d.close === 'function'){
                    d.close()
                }else d.removeAttribute('open')
            }
        }
    }, [open])

    if(!open){
        return null
    }

    async function handleCreate() {
        if(!name.trim()){
            setErrorMsg('Group name is required')
            return
        }

        setSaving(true)
        setErrorMsg(null)


        try{
            await onCreate(name.trim(), description.trim() || null)
            onClose()
        }catch(err){
            setErrorMsg(err.message || 'Failed to create fleet group')
        }finally{
            setSaving(false)
        }
    }

    return (
        <dialog
            ref={dialogRef}
            onCancel={onClose}
            className="rounded-xl border border-fleet-border bg-fleet-surface p-0 w-full max-w-md backdrop:bg-black/40 m-auto">
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display font-bold text-fleet-text text-base">
                            Create Fleet Group
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-fleet-secondary hover:text-fleet-text transition-colors"
                            aria-label="close">
                                <X className="w-5 h-5"></X>
                            </button>
                    </div>

                    {errorMsg && (
                        <p className="text-xs text-fleet-alert mb-3">
                            {errorMsg}
                        </p>
                    )}


                    <div className="mb-4">
                        <label htmlFor="group-name" className="text-xs font-medium text-fleet-secondary uppercase tracking-wide mb-2 block">
                            Group Name 
                        </label> 

                        <input
                            id="group-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Gauteng group"
                            className="w-full text-sm border border-fleet-border rounded-lg px-3 py-2 bg-fleet-surface text-fleet-text">

                            </input>


                    </div>
                    
                    <div className="mb-5">
                        <label htmlFor="group-description" className="text-xs font-medium text-fleet-secondary uppercase tracking-wide mb-2 block">
                            Description (optional)
                        </label> 

                        <textarea
                            id="group-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="What is this group used for?"
                            className="w-full text-sm border border-fleet-border rounded-lg px-3 py-2 bg-fleet-surface text-fleet-text resize-none">


                    </textarea>
                    </div>

                    <div className="flex items-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-sm text-fleet-secondary hover:text-fleet-text transition-colors font-medium"
                        >
                                Cancel
                            </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleCreate}
                            className="text-sm bg-fleet-blue text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-fleet-blue/90 transition-colors"
                        >
                                {saving ? 'Creating...' : 'Create Group'}
                            </button>
                    </div>
                </div>
            </dialog>
    )
}

CreateFleetGroupModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onCreate: PropTypes.func.isRequired,
}