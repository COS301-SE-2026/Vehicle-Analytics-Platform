import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ArticleView({ article, categoryTitle, onBack }){
    return (
        <div className='flex flex-col h-full'>
          <div className='flex items-center gap-2 px-4 py-3 border-b border-fleet-secondary'>
            <button
              onClick={onBack}
              className='text-fleet-secondary hover:text-fleet-secondary/90 transition-colors'
              aria-label={`Back to ${categoryTitle}`}
            >
              <ArrowLeft size={18}/>
            </button>
            <span className='text-sm text-fleet-secondary'>{categoryTitle}</span>
          </div>

          <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
            <h2 className='text-base font-semibold text-fleet-secondary'>{article.title}</h2>

            {article.content.map((block, i) => (
                <div key={i}>
                  {block.type === "text" && ( 
                    <p className='text-sm text-fleet-text leading-relaxed'>{block.text}</p>
                  )}

                  {block.type === "list" && (
                    <ul className='list-disc list-inside space-y-1.5 text-sm text-fleet-secondary'>
                        {block.items.map((item, j) =>
                           <li key={j}>{item}</li> 
                        )}
                    </ul>
                  )}

                  {block.type === "callout" && (
                    <div className='rounded-lg bg-fleet-blue/80 border border-fleet-blue px-3 py-2 text-sm text-fleet-surface'>
                        {block.text}
                    </div>
                  )}

                  {block.type === "table" && (
                    <div className='overflow-x-auto rounded-lg border border-fleet-secondary'>
                      <table className='w-full text-sm text-left'>
                        <thead className='bg-fleet-bg'>
                            <tr>
                              {block.headers.map((header, j) => (
                                <th key={j} className='px-3 py-2 font-medium text-fleet-secondary'>
                                   {header}
                                </th>
                              ))}
                            </tr>
                        </thead>
                        <tbody>
                           {block.rows.map((row, j) =>(
                            <tr key={j} className={cn(j > 0 && "border-t border-fleet-secondary")}>
                              {row.map((cell, k) => (
                                <td key={k} className='px-3 py-3 text-fleet-secondary'>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                           ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {block.type === "glossary" && (
                    <dl className='space-y-3'>
                      {block.terms.map(({ term, definition }, j) => (
                        <div key={j}>
                          <dt className='text-sm font-semibold text-fleet-secondary'>{term}</dt>
                          <dd className='text-sm text-fleet-secondary mt-0.5'>{definition}</dd>
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