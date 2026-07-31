import { useEffect, useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight,
  ChartLine,
  Car,
  Globe,
  PlayCircle,
  Compass,
 } from 'lucide-react';
import { ArticleView } from './ArticleView';

const ICONS = {
  "bar-chart": ChartLine,
  car: Car,
  "map-pin": Globe,
  "play-circle": PlayCircle,
};

export function CategoryList({ categories, externalArticle, onArticleShown }) {
    const [expandedId, setExpandedId] = useState(null);
    const [ activeArticle, setActiveArticle ] = useState(null);

    useEffect(() => {
      if(externalArticle) {
        setActiveArticle(externalArticle);
        onArticleShown?.();
      }
    }, [externalArticle]);

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
            const CategoryIcon = ICONS[category.icon] ?? Compass;

            return (
              <div key={category.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : category.id)}
                  className={`w-full flex items-center justify-between px-2 py-3 text-m font-medium text-left text-fleet-text transition-colors ${
                    isExpanded ? 'text-fleet-blue' : 'text-fleet-text hover:bg-fleet-bg'}`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon size={16} />
                    <span >{category.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className='text-fleet-blue'/>
                  ) : (
                    <ChevronRight size={16} className='text-fleet-text'/>
                  )}
                </button>

                {isExpanded && (
                  <div className='pb-2'>
                    {category.articles.map((article) => (
                        <button
                            type="button"
                            key={article.id}
                            onClick={() => 
                                setActiveArticle({
                                    categoryId: category.id,
                                    articleId: article.id,
                                })
                            }
                            className='w-full text-left px-4 py-2 rounded-md hover-md hover:bg-fleet-idle/30 transition-all'
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