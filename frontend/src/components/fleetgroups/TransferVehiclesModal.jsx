import{
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
}from '@/components/ui/alert-dialog';

import {ArrowRightLeft} from 'lucide-react'
import formatVehicleList from '@/utils/formatVehicleList';

export default function TransferVehiclesModal({open, onOpenChange, vehicleIds, fromName, toName, onConfirm}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-fleet-surface">
                <AlertDialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fleet-blue/10">
                        <ArrowRightLeft className="h-6 w-6 text-fleet-blue"></ArrowRightLeft>
                    </div>
                    <AlertDialogTitle className="text-center text-fleet-text font-bold">
                        Transfer Vehicles
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-fleet-secondary">
                        Move{' '}
                        <span className="font-medium text-fleet-text">{formatVehicleList(vehicleIds)}</span> from{' '}
                        <span className="font-medium text-fleet-text">{fromName}</span> to{' '}
                        <span className="font-medium text-fleet-text">{toName}</span>?
                        They will follow {toName}&apos;s alert rules and manager from now on.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <AlertDialogAction
                        className="h-12 text-white bg-fleet-blue hover:bg-fleet-blue/90"
                        onClick={() => onConfirm?.()}
                    >
                        Transfer
                    </AlertDialogAction>
                    <AlertDialogCancel
                        className="h-12 text-fleet-secondary"
                        onClick={() => onOpenChange?.(false)}
                    >
                        Cancel
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}