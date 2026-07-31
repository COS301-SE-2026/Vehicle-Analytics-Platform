import {render, screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import { CategoryList } from '@/components/help/CategoryList';

jest.mock('lucide-react', () => ({
    ChevronDown:(props) => <span data-testid="icon-chevron-down" {...props}/>,
    ChevronRight:(props) => <span data-testid="icon-chevron-right" {...props}/>,
    ChartLine:(props) => <span data-testid="icon-chart-line" {...props}/>,
    Car:(props) => <span data-testid="icon-car" {...props}/>,
    Globe:(props) => <span data-testid="icon-globe" {...props}/>,
    PlayCircles:(props) => <span data-testid="icon-play-circles" {...props}/>,
    Compass:(props) => <span data-testid="icon-compass" {...props}/>,
}));

jest.mock('@/components/help/ArticleView' , () => ({
    ArticleView: ({article, categoryTitle, onBack }) => (
        <div data-testid="article-view">
            <span>{categoryTitle}</span>
            <span>{article.title}</span>
            <button onClick={onBack}>Back</button>
        </div>
    ),
}));

function buildCategories(){
    return [
        {
            id: 'looking',
            title: 'Looking',
            icon: 'bar-chart',
            articles: [
                {id: 'a1', title: 'How to do something', preview: 'Do something'},
                {id: 'a2', title: 'Look for Stuff', preview: 'Stuff'},
            ],
        },
        {
            id: 'vehicles',
            title: 'Vehicles',
            icon: 'car',
            articles: [{id: 'v1', title: 'Add Vehicle', preview: 'Add'}],
        },
        {
            id: 'others',
            title: 'Others',
            icon: 'unknown-icon',
            articles: [],
        },
    ];
}

describe('CategoryList', () => {
    test('Renders a collapsed list of category titles', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>);
        expect(screen.getByText('Looking')).toBeInTheDocument();
        expect(screen.getByText('Vehicles')).toBeInTheDocument();
        expect(screen.getByText('Others')).toBeInTheDocument();
        expect(screen.queryByText('Look for stuff')).not.toBeInTheDocument();
    });

    test('falls back to Compass icon for unmapped icon key', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>)
        const otherButton = screen.getByText('Others').closest('button');
        expect(otherButton.querySelector('[data-testid="icon-compass"]')).toBeInTheDocument();
    });

    test('expand a category on click, revealing its articles', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>);
        fireEvent.click(screen.getByText('Looking'));
        expect(screen.getByText('How to do something')).toBeInTheDocument();
        expect(screen.getByText('Look for Stuff')).toBeInTheDocument();
        expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument();

    });

    test('collapses an expanded category when clicked again', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>);
        fireEvent.click(screen.getByText('Looking'));
        expect(screen.getByText('How to do something')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Looking'));
        expect(screen.queryByText('How to do something')).not.toBeInTheDocument();
    });

    test('one category expanded at a time', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>);
        fireEvent.click(screen.getByText('Looking'));
        fireEvent.click(screen.getByText('Vehicles'));
        expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
        expect(screen.queryByText('How to do something')).not.toBeInTheDocument();
    });

    test('clicking article shows ArticleView with the correct props', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>);
        fireEvent.click(screen.getByText('Looking'));
        fireEvent.click(screen.getByText('How to do something'));
        const view = screen.getByTestId('article-view');
        expect(view).toHaveTextContent('Looking');
        expect(view).toHaveTextContent('How to do something');
    });

    test('back button in ArticleView returns to category list', () => {
        const categories = buildCategories();
        render(<CategoryList categories={categories}/>);
        fireEvent.click(screen.getByText('Looking'));
        fireEvent.click(screen.getByText('How to do something'));
        expect(screen.getByTestId('article-view')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Back'));
        expect(screen.queryByTestId('article-view')).not.toBeInTheDocument();
        expect(screen.getByText('Looking')).toBeInTheDocument();
    });

    test('renders externally supplied article and calls onArticleShown once', () => {
        const categories = buildCategories();
        const onArticleShown = jest.fn();
        const externalArticle = { categoryId: 'vehicles', articleId: 'v1' };
        render(
            <CategoryList
                categories={categories}
                externalArticle={externalArticle}
                onArticleShown={onArticleShown}
            />
        );
        const view = screen.getByTestId('article-view');
        expect(view).toHaveTextContent('Vehicles');
        expect(view).toHaveTextContent('Add Vehicle');
        expect(onArticleShown).toHaveBeenCalledTimes(1);
    });

    test('falls back to category List for unkown externalArticle', () => {
        const categories = buildCategories();
        const externalArticle = {categoryId: 'no', articleId: 'no'};
        render(<CategoryList categories={categories} externalArticle={externalArticle}/>);
        expect(screen.queryByTestId('article-view')).not.toBeInTheDocument();
        expect(screen.getByText('Looking')).toBeInTheDocument()
    })

    test('does not throw when onArticleShown is not provided', () => {
        const categories = buildCategories();
        const externalArticle = {categoryId: 'looking', articleId: 'l1'};
        expect(() => render(<CategoryList categories={categories} externalArticle={externalArticle}/>
        )).not.toThrow()
    });
    
});