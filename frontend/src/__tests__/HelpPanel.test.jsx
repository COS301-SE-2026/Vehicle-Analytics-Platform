import {render, screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import { HelpPanel } from '@/components/help/HelpPanel';
import { getHelpMenuForRole } from '@/data/helpMenuContent';

jest.mock('lucide-react', () =>({
    X:(props) => <span data-testid="icon-x" {...props}/>,
    Search: (props) => <span data-testid="icon-search" {...props}/>
}));

jest.mock('@/lib/utils', () => ({
    cn: (...args) => args.filter(Boolean).join(' '),
}));

jest.mock('@/components/ui/button',() => ({
    Button: ({ children, onClick, ...rest}) => (
        <button onClick={onClick} {...rest}>{children}</button>
    ),
}));

jest.mock('@/components/help/CategoryList', () => ({
    CategoryList: ({categories}) => (
        <div> data-testid='category-list'
            {categories.map((c) => (
                <span key={c.id}>{c.title}</span>
            ))}
        </div>
    ),
}));

jest.mock('@/data/helpMenuContent', () => ({
    getHelpMenuForRole: jest.fn(),
}));

describe('HelpPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getHelpMenuForRole.mockReturnValue([
            {id: 'looking', title: 'Looking', articles: []},
            {id: 'vehicles', title: 'Vehicles', articles: []},
        ]);
    });

    test('require help for content for the given role', () => {
        render(<HelpPanel isOpen={true} onClose={jest.fn()} role="admin"/>);
        expect(getHelpMenuForRole).toHaveBeenCalledWith('admin');
    });

    test('require categories returned for the role', () => {
        render(<HelpPanel isOpen={true} onClose={jest.fn()} role="viewer"/>);
        expect(screen.getByText('Looking')).toBeInTheDocument();
        expect(screen.getByText('Vehicles')).toBeInTheDocument();
    });

    test('shows open state styling when isOpen is true', () => {
        render(<HelpPanel isOpen={true} onClose={jest.fn()} role="viewer"/>);
        const panel = screen.getByTestId('help-panel');
        expect(panel.className).toContain('translate-x-0');
        expect(panel).not.toHaveAttribute('inert');
    });

    test('shows closed state styling and inert attribure when isOpen is false', () => {
        render(<HelpPanel isOpen={false} onClose={jest.fn()} role="viewer"/>);
        const panel = screen.getByTestId('help-panel');
        expect(panel.className).toContain('translate-x-full');
        expect(panel).toHaveAttribute('inert');
    });

    test('calls onClose when button is clicked', () => {
        const onClose = jest.fn();
        render(<HelpPanel isOpen={true} onClose={onClose} role="viewer"/>);
        fireEvent.click(screen.getByLabelText('Close help panel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('update search input value as the user types', () => {
        render(<HelpPanel isOpen={true} onClose={jest.fn()} role="viewer"/>);
        const input = screen.getByPlaceholderText('Search for guides, tips or troubleshooting...');
        fireEvent.change(input, {target:{value: 'look'}});
        expect(input).toHaveValue('look');
    });

    test('search input starts empty', () => {
        render(<HelpPanel isOpen={true} onClose={jest.fn()} role="viewer"/>);
        const input = screen.getByPlaceholderText('Search for guides, tips or troubleshooting...');
        expect(input).toHaveValue('');
    });

    test('re-fetches help content when roles changes', () => {
        const {rerender} = render(<HelpPanel isOpen={true} onClose={jest.fn()} role="viewer"/>);
        expect(getHelpMenuForRole).toHaveBeenCalledWith('viewer');
        rerender(<HelpPanel isOpen={true} onClose={jest.fn()} role="admin"/>)
        expect(getHelpMenuForRole).toHaveBeenCalledWith('admin');
    });
})


