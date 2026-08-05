import{ useMemo, useState } from 'react';
import { X, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHelpMenuForRole } from '@/data/helpMenuContent';
import { CategoryList } from './CategoryList';
import { Button } from '../ui/button';

function blockToText(block){
  switch (block.type) {
    case 'text':
      case 'callout':
        return block.text ?? '';
      case 'list':
        return(block.items ?? []).join(' ');
      case 'image':
        return block.alt ?? '';
      case 'table':
        return [...(block.headers ?? []), ...(block.rows ?? []).flat()]
         .filter((v) => typeof v === 'string').join(' ');
      case 'glossary':
        return(block.terms ?? [])
         .map((t) => `${t.term} ${t.definition}`).join(' ');
      default:
        return '';
  }
}

export function HelpPanel({ isOpen, onClose, role }){
    const [query, setQuery] = useState('');
    const categories = getHelpMenuForRole(role);

    const flatArticles = useMemo(() => {
      return categories.flatMap((category) => 
      (category.articles ?? []).map((article) => ({
        ...article,
        categoryId: category.id,
        categoryTitle: category.title,
        searchTitle: category.title,
        searchText: [
          article.title,
          article.preview ?? '',
          ...(article.content ?? []).map(blockToText),
        ]
        .join(' ').toLowerCase(),
      }))
    );
    }, [categories]);

    const results = useMemo(() => {
      const q = query.trim().toLowerCase();
      if(!q) return null;
      return flatArticles.filter((a) => a.searchText.includes(q));
    }, [query, flatArticles]);

  function openFromSearch(article){
    setRequestedArticle({categoryId: article.categoryId, articleId: article.id});
    setQuery('');
  }

    return(
        <>
          {/* Backdrop */}
          <button
           type="button"
           aria-label="Dismiss help panel"
           tabIndex={isOpen ? 0 : - 1}
           onClick={onClose}
           className={cn("fixed inset-0 bg-fleet-blue/20 transition-opacity duration-200 z-40",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
           )}
          />

           {/* Panel */}
           <dialog
             aria-label="Help Center"
             className={cn("fixed top-0 right-0 left-auto bottom-auto m-0 max-w-none max-w-none max-h-none", 
                "h-full w-full sm:w-[380px] bg-fleet-surface shadow-xl z-50",
                "flex flex-col transition-transform duration-200 ease-out",
                isOpen ? "translate-x-0" : "translate-x-full"
           )}
            open={isOpen}
           >

           {/* Header */}
           <div className='flex items-center justify-between px-4 py-3 border-b border-fleet-secondary'>
             <h1 className='text-xl font-bold text-fleet-blue'>Help Center</h1>
             <Button
              onClick={onClose}
              className='text-fleet-surface bg-fleet-blue hover:bg-fleet-blue/80 transition-colors'
              aria-label="Close help panel"
             >
                <X size={18}/>
             </Button>
           </div>

           {/* Search */}
           <div className='px-4 py-3'>
             <div className='flex items-center gap-2 rounded-lg border border-fleet-secondary px-3 py-2'>
                <Search size={16} className='text-fleet-text'/>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for guides, tips or troubleshooting..."
                  className='flex-1 text-sm text-fleet-secondary placeholder:text-fleet-secondary/90 outline-none bg-transparent cursor-text'
                />
             </div>
           </div>

           {results !== null ? (
            <div class="flex-1 overflow-y-auto px-4 py-2">
              {results.length === 0 ? (
                <p className="text-sm text-fleet-secondary/70 py-6 text-center">
                  No results for {query}
                </p>
              ) : (
                <ul className='didvide-y divide-fleet-secondary/20'>
                  {results.map((article) => (
                    <li key={article.id}>
                      <button
                       type='button'
                       onClick={() => {() => openFromSearch(article)}}
                        className='w-full flex items-center gap-3 py-3 text-left hover:bg-fleet-idle/10 transition-colors'
                      >
                        <FileText size={16} className="shrink-0 text-fleet-blue"/>
                        <div>
                          <p className='text-sm font-medium text-fleet-secondary'>{article.title}</p>
                          <p className='text-xs text-fleet-secondary/60'>{article.categoryTitle}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
           ) : (
             <CategoryList categories={categories} />
           )}
           </dialog>
        </>
    );
}