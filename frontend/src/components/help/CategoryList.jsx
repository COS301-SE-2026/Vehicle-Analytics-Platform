import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ArticleView } from './ArticleView';

export function CategoryList({ categories }) {
    const [expandedId, setExpandedId] = useState(null);
    const [ activeArticle, setActiveArticle ] = useState(null);

    if(activeArticle) {
        const category = categories.find((c) => c.id === activeArticle.categoryId);
        const article = category?.articles.find((a) => a.id === activeArticle.articleId);
        if(article) {
            return (
                <ArticleView
                    article={article}
                    categoryTitle={category.title}
                    onBack={() => setActiveArticle(null)}
                />
            );
        }
    }

    return (
        <div className='flex-1 overflow-y-auto px-2 py-2'>
          {categories.map((category) => {
            const isExpanded = expandedId === category.id;
            return (
                <div 
                 key={category.id}
                 className='border-b border-fleet-secondary last:border-b-0'
                 >
                
                <button
                  onClick={() => setExpandedId(isExpanded ? null : category.id)}
                  className='w-full flex items-center justify-between px-2 py-3 text-sm font-medium text-left text-fleet-text hover:text-fleet-blue/90 transition-colors'
                >
                  <span>{category.title}</span>
                  {isExpanded ? (
                    <ChevronDown size={16} className='text-fleet-secondary'/>
                  ) : (
                    <ChevronRight size={16} className='text-fleet-secondary'/>
                  )}
                </button>

                {isExpanded && (
                  <div className='pb-2'>
                    {category.articles.map((article) => (
                        <button
                            key={article.id}
                            onClick={() => 
                                setActiveArticle({
                                    categoryId: category.id,
                                    articleId: article.id,
                                })
                            }
                            className='w-full text-left px-4 py-2 rounded-md hover-md hover:bg-fleet-blue/90 transition-colors'
                        >
                          <div className='text-md text-fleet-text'>{article.title}</div>
                          <div className='text-sm text-fleet-text mt-0.5'>{article.preview}</div>
                        </button>
                    ))}
                  </div>
                )}
                </div>
            );
          })}
        </div>
    );
}