import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHelpMenuForRole } from '@/data/helpMenuContent';
import { CategoryList } from './CategoryList';
import { Button } from '../ui/button';

export function HelpPanel({ isOpen, onClose, role }){
    const categories = getHelpMenuForRole(role);

    return(
        <>
          {/* Backdrop */}
          <div
           onClick={(e) => e.stopPropagation()}
           className={cn("fixed inset-0 bg-fleet-blue/20 transition-opacity duration-200 z-40",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
           )}
          >

           {/* Panel */}
           <div className={cn("fixed top-0 right-0 h-full w-full sm:w-[380px] bg-fleet-surface shadow-xl z-50",
                "flex flex-col transition-transform duration-200 ease-out",
                isOpen ? "translate-x-0" : "translate-x-full"
           )}
            role="dialog"
            aria-label="Help Center"
            inert={!isOpen}
           >

           {/* Header */}
           <div className='flex items-center justify-between px-4 py-3 border-b border-fleet-secondary'>
             <h1 className='text-xl font-bold text-fleet-blue'>Help Center</h1>
             <Button
              onClick={onClose}
              className='text-fleet-secondary hover:text-fleet-secondary transition-colors'
              aria-label="Close help panel"
             >
                <X size={18}/>
             </Button>
           </div>

           {/* Search */}
           <div className='px-4 py-3 border-b border-fleet-secondary'>
             <div className='flex item-center gap-2 rounded-lg border border-fleet-secondary px-3 py-2'>
                <Search size={16} className='text-fleet-text'/>
                <input
                  type="text"
                  placeholder="Search for guides, tips or troubleshooting..."
                  abled
                  className='flex-1 text-sm text-fleet-secondary placeholder:text-fleet-secondary/90 outline-none bg-transparent cursor-not-allowed'
                />
             </div>
           </div>

           <CategoryList categories={categories} />

           </div>
          </div>
        </>
    );
}