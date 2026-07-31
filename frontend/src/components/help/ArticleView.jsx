import { ArrowLeft, Check, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ArticleView({ article, categoryTitle, onBack }){

  function renderCell(cell) {
    if(cell === true){
      return <Check size={16} className='mx-auto text-fleet-green'/>;
    }
    if(cell === false){
      return <X size={16} className='mx-auto text-fleet-secondary/40'/>
    }
    return cell;
  }

    return (
        <div className='flex flex-col h-full'>
          <div className='flex items-center gap-2 px-4 py-3 border-b border-fleet-secondary'>
            <button
              type="button"
              onClick={onBack}
              className='text-fleet-secondary hover:text-fleet-secondary/90 transition-colors'
              aria-label={`Back to ${categoryTitle}`}
            >
              <ArrowLeft size={18}/>
            </button>
            <span className='text-sm text-fleet-secondary'>{categoryTitle}</span>
          </div>

          <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
            <h2 className='text-base font-bold text-fleet-secondary'>{article.title}</h2>

            {article.content.map((block, i) => (
                <div key={block.id ?? block.type + (block.text ?? '')}>
                  {block.type === "text" && ( 
                    <p className='text-sm text-fleet-text leading-relaxed'>{block.text}</p>
                  )}

                  {block.type === "list" && (
                    <ul className='list-disc list-inside space-y-1.5 text-sm text-fleet-secondary'>
                        {block.items.map((item, j) =>
                           <li key={item}>{item}</li> 
                        )}
                    </ul>
                  )}

                  {block.type === "callout" && (
                    <div className='rounded-lg bg-fleet-blue/40 border border-fleet-blue/20 px-3 py-2'>
                      <Info size={16} className="shrink-0 mt-0.5 text-fleet-blue"/>
                        <p className="text-sm text-fleet-text text-fleet-secondary leading-relaxed">
                          {block.text}
                        </p>
                    </div>
                  )}

                  {block.type === "table" && (
                    (() => {
                      const isMatrix = block.rows.every(row => 
                        row.slice(1).every(cell => typeof cell === 'boolean')
                      );

                      if(isMatrix) {
                        return(
                            <div className='overflow-x-auto rounded-lg border border-fleet-secondary'>
                              <table className='w-full text-sm text-left'>
                                <thead className='bg-fleet-idle/20'>
                                <tr>
                                  {block.headers.map((header, j) => (
                                  <th key={header} className='px-3 py-2 font-medium text-fleet-secondary'>
                                   {header}
                                  </th>
                                ))}
                               </tr>
                             </thead>
                             <tbody>
                              {block.rows.map((row, j) =>(
                              <tr  key={row.join('|')} className={cn(row !== block.rows[0] && "border-t border-fleet-secondary")}>
                              {row.map((cell, k) => (
                                <td key={k} className={cn('px-3 py-3 text-fleet-secondary', k > 0 && 'text-center')}>
                                  {renderCell(cell)}
                                </td>
                              ))}
                              </tr>
                              ))}
                           </tbody>
                         </table>
                       </div>
                        );
                      }

                      return (
                        <div className="grid gap-x-6"
                            style={{ gridTemplateColumns: `repeat(${block.headers.length}, minmax(0, 1fr))`}}
                        >
                          {block.headers.map((header, j) => (
                            <div key={header} className="text-sm font-semibold text-fleet-secondary pb-2">
                              {header}
                            </div>
                          ))}
                          {block.rows.map((row, j) =>
                            row.map((cell, k) => (
                              <div key={`${j}-${k}`} className="text-sm text-fleet-secondary/80 leading-relaxed">
                                {renderCell(cell)}
                              </div>
                            )) 
                          )}
                        </div>
                      );
                    })()
                  )}

                  {block.type === "glossary" && (
                    <dl className='space-y-4'>
                      {block.terms.map(({ term, definition }, j) => (
                        <div key={term} className="relative pl-4 border-1-2 border-fleet-blue/30">
                          <dt className='text-sm font-semibold text-fleet-secondary tracking-tight'>{term}</dt>
                          <dd className='text-sm text-fleet-secondary/80 loading-mixed mt-1'>{definition}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
            ))}
          </div>
        </div>
    );
}