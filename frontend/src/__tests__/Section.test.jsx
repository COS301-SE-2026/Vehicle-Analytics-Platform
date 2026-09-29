import { render, screen } from '@testing-library/react';
import Sections, {
    WhatYouGet,
    MoreCapabilities,
    HowItWorks,
    CommandCenter,
} from '@/pages/landing/Sections';

jest.mock('framer-motion', () => {
    const React = require("react");
    const FRAMER_PROPS = ['initial', 'animate', 'whileInView', 'viewport', 'transition', 'exit'];

    return {
        motion: new Proxy(
            {},
            {
                get: (_target, tag) => React.forwardRef((props, ref) => {
                    const domProps = { ...props };
                    FRAMER_PROPS.forEach((p) => delete domProps[p]);
                    return React.createElement(tag, { ...domProps, ref });
                }),
            }
        ),
    };
});


beforeAll(() => {
    class MockIntersectionObserver {
        constructor(callback) {
            this.callback = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
    }
    global.IntersectionObserver = MockIntersectionObserver;
    window.IntersectionObserver = MockIntersectionObserver;
});

describe('WhatYouGet', () => {
    test('renders the section heading', () => {
        render(<WhatYouGet />);
        const heading = screen.getByRole('heading', { name: /what you get, every day/i });
        expect(heading).toBeInTheDocument();
    });

    test('renders all four feature titles', () => {
        render(<WhatYouGet />);
        expect(screen.getByText(/live fleet map/i)).toBeInTheDocument();
        expect(screen.getByText(/driver safety scoring/i)).toBeInTheDocument();
        expect(screen.getByText(/trip history & playback/i)).toBeInTheDocument();
        expect(screen.getByText(/role-based dashboards/i)).toBeInTheDocument();
    });

    test('renders the product showcase screenshots', () => {
        render(<WhatYouGet />);
        expect(screen.getByAltText(/live map/i)).toBeInTheDocument();
        expect(screen.getByAltText(/vehicle comparison/i)).toBeInTheDocument();
        expect(screen.getByAltText(/trip replay/i)).toBeInTheDocument();
    });
});

describe('MoreCapabilities', () => {
    test('renders the section heading', () => {
        render(<MoreCapabilities />);
        const heading = screen.getByRole('heading', { name: /built for how fleets actually run/i });
        expect(heading).toBeInTheDocument();
    });

    test('renders all four capability cards', () => {
        render(<MoreCapabilities />);
        const titles = screen.getAllByRole('heading', { level: 3 });
        expect(titles).toHaveLength(4);
    });

    
    test('renders the description on the back of each card', () => {
        render(<MoreCapabilities />);
        expect(screen.getByText(/custom organization tags/i)).toBeInTheDocument();
        expect(screen.getByText(/your own speed thresholds/i)).toBeInTheDocument();
        expect(screen.getByText(/no extra hardware needed/i)).toBeInTheDocument();
        expect(screen.getByText(/daily and weekly summaries/i)).toBeInTheDocument();
    });

    test('each card is reachable by keyboard', () => {
        const { container } = render(<MoreCapabilities />);
        expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(4);
    });
});

describe('HowItWorks', () => {
    test('renders the section heading', () => {
        render(<HowItWorks />);
        const heading = screen.getByRole('heading', { name: /how v\.a\.p\.o\.r works/i });
        expect(heading).toBeInTheDocument();
    });

    test('renders all three flow step titles', () => {
        render(<HowItWorks />);
        expect(screen.getByText('Live Data Stream')).toBeInTheDocument();
        expect(screen.getByText('Cloud Processing')).toBeInTheDocument();
        expect(screen.getByText('Dashboard Insights')).toBeInTheDocument();
    });

    test('renders one fewer connecting arrow than there are steps', () => {
        const { container } = render(<HowItWorks />);
        const arrows = container.querySelectorAll('svg.lucide-arrow-right');
        expect(arrows).toHaveLength(2);
    });
});

describe('CommandCenter', () => {
    test('renders the section heading', () => {
        render(<CommandCenter />);
        const heading = screen.getByRole('heading', { name: /your command center/i });
        expect(heading).toBeInTheDocument();
    });

    test('renders the dashboard screenshot', () => {
        render(<CommandCenter />);
        const image = screen.getByAltText('V.A.P.O.R Fleet Dashboard');
        expect(image).toBeInTheDocument();
    });
});

describe('Sections (default export)', () => {
    test('renders all four subsections together', () => {
        render(<Sections />);
        expect(screen.getByRole('heading', { name: /what you get, every day/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /built for how fleets actually run/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /how v\.a\.p\.o\.r works/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /your command center/i })).toBeInTheDocument();
    });
});