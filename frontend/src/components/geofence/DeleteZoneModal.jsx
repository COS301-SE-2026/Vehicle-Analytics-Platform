import { 
    AlertDialog, 
    AlertDialogContent, 
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
    } from '@/components/ui/alert-dialog';
import { TriangleAlert } from 'lucide-react';

export default function DeleteZoneModal({open, onOpenChange, zone, onConfirm}) {
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-fleet-surface">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fleet-alert/20 sm:sm-0">
            <TriangleAlert className="h-8 w-8 text-fleet-alert"/>
          </div>
          <AlertDialogTitle className="text-center text-fleet-text font-bold">
             Delete Zone
          </AlertDialogTitle>
          <AlertDialogDescription className="text-fleet-secondary">
            Are you sure you want to delete the {" "}
            <span className="font-medium text-fleet-text">{zone?.name} </span>
              zone? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            className="h-12 text-white bg-fleet-blue hover:bg-fleet-blue/90"
            onClick={() => onConfirm?.(zone)}
          >
            Delete
          </AlertDialogAction>
          <AlertDialogCancel className="h-12 text-fleet-secondary">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
