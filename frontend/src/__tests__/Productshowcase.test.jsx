import { render, screen, act } from '@testing-library/react';
import ProductShowcase from '@/pages/landing/Productshowcase';

let observers = [];

class MockIntersectionObserver {
    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observe = jest.fn();
        this.unobserve = jest.fn();
        this.disconnect = jest.fn();
        observers.push(this);
    }

    takeRecords() {
        return [];
    }

    // Test helper
    trigger(isIntersecting) {
        act(() => {
            this.callback([{ isIntersecting }], this);
        });
    }
}

beforeAll(() => {
    global.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;
});

beforeEach(() => {
    observers = [];
});

const panelFor = (altPattern) => screen.getByAltText(altPattern).parentElement;

describe('ProductShowcase', () => {
    test('renders all three screenshots', () => {
        render(<ProductShowcase />);
        expect(screen.getByAltText(/live map/i)).toBeInTheDocument();
        expect(screen.getByAltText(/vehicle comparison/i)).toBeInTheDocument();
        expect(screen.getByAltText(/trip replay/i)).toBeInTheDocument();
    });

    test('every screenshot has descriptive alt text', () => {
        const { container } = render(<ProductShowcase />);
        const images = container.querySelectorAll('img');
        expect(images).toHaveLength(3);
        images.forEach((img) => {
            expect(img).toHaveAttribute('alt');
            expect(img.getAttribute('alt').length).toBeGreaterThan(0);
        });
    });

    test('screenshots are lazy loaded', () => {
        const { container } = render(<ProductShowcase />);
        container.querySelectorAll('img').forEach((img) => {
            expect(img).toHaveAttribute('loading', 'lazy');
        });
    });

    test('observes the container on mount', () => {
        render(<ProductShowcase />);
        expect(observers).toHaveLength(1);
        expect(observers[0].observe).toHaveBeenCalledTimes(1);
    });

    test('panels start hidden before the section is in view', () => {
        render(<ProductShowcase />);
        expect(panelFor(/live map/i)).toHaveClass('opacity-0');
        expect(panelFor(/vehicle comparison/i)).toHaveClass('opacity-0');
        expect(panelFor(/trip replay/i)).toHaveClass('opacity-0');
    });

    test('panels become visible once the section enters the viewport', () => {
        render(<ProductShowcase />);
        observers[0].trigger(true);

        expect(panelFor(/live map/i)).toHaveClass('opacity-100');
        expect(panelFor(/vehicle comparison/i)).toHaveClass('opacity-100');
        expect(panelFor(/trip replay/i)).toHaveClass('opacity-100');
    });

    test('stays hidden while the section is out of view', () => {
        render(<ProductShowcase />);
        observers[0].trigger(false);
        expect(panelFor(/live map/i)).toHaveClass('opacity-0');
    });

    test('stops observing after the animation has played once', () => {
        render(<ProductShowcase />);
        observers[0].trigger(true);
        expect(observers[0].disconnect).toHaveBeenCalled();
    });

    test('panels are staggered so they do not all arrive together', () => {
        render(<ProductShowcase />);
        expect(panelFor(/live map/i)).toHaveStyle({ transitionDelay: '0ms' });
        expect(panelFor(/vehicle comparison/i)).toHaveStyle({ transitionDelay: '180ms' });
        expect(panelFor(/trip replay/i)).toHaveStyle({ transitionDelay: '340ms' });
    });

    test('each panel enters from its own direction', () => {
        render(<ProductShowcase />);
       
        expect(panelFor(/live map/i)).toHaveClass('translate-y-10');
        expect(panelFor(/vehicle comparison/i)).toHaveClass('translate-x-12');
        expect(panelFor(/trip replay/i)).toHaveClass('translate-x-10');
    });

    test('accepts a className for the outer container', () => {
        const { container } = render(<ProductShowcase className="mt-10" />);
        expect(container.firstChild).toHaveClass('mt-10');
    });

    test('disconnects the observer on unmount', () => {
        const { unmount } = render(<ProductShowcase />);
        unmount();
        expect(observers[0].disconnect).toHaveBeenCalled();
    });
});