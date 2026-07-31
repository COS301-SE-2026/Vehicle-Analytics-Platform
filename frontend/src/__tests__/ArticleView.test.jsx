import {render, screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArticleView } from '@/components/help/ArticleView';

jest.mock('lucide-react', () => ({
    ArrowLeft: (props) => <span data-testid="icon-arrow-left"{...props}/>,
    Check: (props) => <span data-testid="icon-check"{...props}/>,
    X: (props) => <span data-testid="icon-x"{...props}/>,
    Info: (props) => <span data-testid="icon-info"{...props}/>,
}));

jest.mock('@/lib/utils', () => ({
    cn:(...args) => args.filter(Boolean).join(''),
}));

describe('ArticleView', () => {
    const baseProps = {
        categoryTitle: 'Getting Started',
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders category title and article title', () => {
        const article = {title: 'Welcome Guide', content:[]};
        render(<ArticleView article={article}{...baseProps}/>);
        expect(screen.getByText('Getting Started')).toBeInTheDocument();
         expect(screen.getByText('Welcome Guide')).toBeInTheDocument();
    });

     test('calls onBack when back button is clicked', () => {
        const article = {title: 'Welcome Guide', content:[]};
        render(<ArticleView article={article}{...baseProps}/>);
        fireEvent.click(screen.getByLabelText('Back to Getting Started'));
        expect(baseProps.onBack).toHaveBeenCalledTimes(1);
    });

     test('renders a text block', () => {
        const article = {title: 'T', content:[{ type: 'text', text:'Hello'}]};
        render(<ArticleView article={article}{...baseProps}/>);
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

     test('renders list block with each item', () => {
        const article = {title: 'T', content:[{type: 'list', items: ['1', '2', '3']}]};
        render(<ArticleView article={article}{...baseProps}/>);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

     test('renders empty list without crashing', () => {
        const article = {title: 'T', content:[{type: 'list', items: []}]};
        render(<ArticleView article={article}{...baseProps}/>);
        expect(screen.getByText('T')).toBeInTheDocument();
    });

     test('renders callback block with text and icon', () => {
        const article = {title: 'T', content:[{type: 'callout', text: 'FYI'}]};
        render(<ArticleView article={article}{...baseProps}/>);
        expect(screen.getByText('FYI')).toBeInTheDocument();
        expect(screen.getByTestId('icon-info')).toBeInTheDocument();
     });

     test('renders matrix table with checks and Xs for booleans', () => {
        const article = {
            title: 'T',
            content: [
                {
                    type: 'table',
                    headers: ['A', 'B', 'C'],
                    rows: [
                        ['Row1', true, true],
                        ['Row2', false, true],
                    ],
                },
            ],
        };
        render(<ArticleView article={article}{...baseProps}/>);

        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('Row1')).toBeInTheDocument();
        expect(screen.getByText('Row2')).toBeInTheDocument();
        expect(screen.getAllByTestId('icon-check').length).toBe(3);
        expect(screen.getAllByTestId('icon-x').length).toBe(1);
        expect(screen.queryByText('true')).not.toBeInTheDocument();
        expect(screen.queryByText('false')).not.toBeInTheDocument();
     });

     test('renders non-matrix table as grid with plain values', () => {
        const article = {
            title: 'T',
            content: [
                {
                    type: 'table',
                    headers: ['Plain', 'Value'],
                    rows: [
                        ['First', '10'],
                        ['Second', '20'],
                    ],
                },
            ],
        };
        render(<ArticleView article={article}{...baseProps}/>);

        expect(screen.getByText('Plain')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.queryByText('table')).not.toBeInTheDocument();
     });

        test('Table with boolean-only first column as non-matrix', () => {
        const article = {
            title: 'T',
            content: [
                {
                    type: 'table',
                    headers: ['Enable', 'Name'],
                    rows: [
                        [true, 'Row1'],
                    ],
                },
            ],
        };
        render(<ArticleView article={article}{...baseProps}/>);
        expect(screen.getByText('Row1')).toBeInTheDocument();
        
     });

        test('renders multiple content blocks in order', () => {
        const article = {
            title: 'T',
            content: [
                    {type: 'text', text: "First paragraph"},
                    {type: 'list', items: ['item1']},
                    {type: 'callout', text: "take note"},
            ],
        };
        render(<ArticleView article={article}{...baseProps}/>);

        expect(screen.getByText('First paragraph')).toBeInTheDocument();
        expect(screen.getByText('item1')).toBeInTheDocument();
        expect(screen.getByText('take note')).toBeInTheDocument();
    });

       test('renders glossary block with terms and definitions', () => {
        const article = {
            title: 'T',
            content: [
                {
                    type: 'glossary',
                    terms: [
                        {term:'The Sun', definition: 'A star'},
                        {term:'The Earth', definition: 'A planet'},
                    ],
                },
            ],
        };
        render(<ArticleView article={article}{...baseProps}/>);

        expect(screen.getByText('The Sun')).toBeInTheDocument();
        expect(screen.getByText('A star')).toBeInTheDocument();
        expect(screen.getByText('The Earth')).toBeInTheDocument();
     })

        test('renders non-matrix table as grid with plain values', () => {
        const article = {
                title: 'T',
                content: [{
                    type: 'unkown-block'
                }]
        };
       
        expect(() => render(<ArticleView article={article} {...baseProps}/>)).not.toThrow();
        expect(screen.getByText('T')).toBeInTheDocument();
     })
})