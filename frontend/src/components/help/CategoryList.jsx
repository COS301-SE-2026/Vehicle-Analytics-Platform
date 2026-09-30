import { useEffect, useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight,
  ChartLine,
  Car,
  Globe,
  PlayCircle,
  Compass,
  Rocket,
  UsersRound,
  TrendingUp,
  Bell,
  Fuel
 } from 'lucide-react';
import { ArticleView } from './ArticleView';

const ICONS = {
  rocket: Rocket,
  "bar-chart": ChartLine,
  car: Car,
  groups: UsersRound,
  "map-pin": Globe,
  "play-circle": PlayCircle,
  "trending-up": TrendingUp,
  bell: Bell,
  fuel: Fuel,
};

export function CategoryList({ categories, externalArticle, onArticleShown }) {
    const [expandedId, setExpandedId] = useState(null);
    const [ activeArticle, setActiveArticle ] = useState(null);

    useEffect(() => {
      if(externalArticle) {
        queueMicrotask(() => {
          setActiveArticle(externalArticle);
          onArticleShown?.();
        });
      }
    }, [externalArticle, onArticleShown]);

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
        <div
          key={category.id}
          className='border-b border-fleet-secondary/15 last:border-b-0'
        >
          <button
            type="button"
            onClick={() => setExpandedId(isExpanded ? null : category.id)}
            className={`w-full flex items-center justify-between px-2 py-3 text-base font-semibold text-left transition-colors ${
              isExpanded
                ? 'text-fleet-blue'
                : 'text-fleet-text hover:bg-fleet-bg'
            }`}
          >
            <div className="flex items-center gap-3">
              <CategoryIcon size={16} />
              <span>{category.title}</span>
            </div>
            {isExpanded ? (
              <ChevronDown size={16} className='text-fleet-blue'/>
            ) : (
              <ChevronRight size={16} className='text-fleet-text'/>
            )}
          </button>

          {isExpanded && (
            <div className='mb-3 space-y-0.5 rounded-md border-l-2 border-fleet-blue/40 bg-fleet-bg py-2 pl-3 pr-2'>
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
                  className='w-full text-left px-2 py-2 rounded-md hover:bg-fleet-idle/20 transition-colors'
                >
                  <div className='text-sm font-medium text-fleet-text'>
                    {article.title}
                  </div>
                  <div className='text-xs text-fleet-secondary mt-0.5'>
                    {article.preview}
                  </div>
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