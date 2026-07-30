import {render, screen } from '@testing-library/react';
import Sections, {WhatYouGet, HowItWorks, CommandCenter} from '@/pages/landing/Sections';

jest.mock('framer-motion', () => {
    const React = require("react");
    const FRAMER_PROPS = ['initial', 'animate', 'whileInView', 'viewport', 'transition', 'exit'];

    return {
      motion: new Proxy(
        {},
        {
            get: (_target, tag) => React.forwardRef((props, ref) => {
                const domProps = {...props};
                FRAMER_PROPS.forEach((p) => delete domProps[p]);
                return React.createElement(tag, {...domProps, ref});
            }),
        }
    ),
    };
});

describe('WhatYouGet', () => {
    test('renders the section heading', () => {
        render(<WhatYouGet/>);
        const heading = screen.getByRole('heading', {name: /what you get, every day/i});
        expect(heading).toBeInTheDocument();
    });

    test('renders all four features titles', () => {
        const expectedTitles = [
            /always know where your fleet is/i,
            /catch risky driving before it costc you/i,
            /settle any dispute in minutes/i,
            /give everyone the right view, Instantly/i,
        ];
        render(<WhatYouGet />)
        const image = screen.getByAltText('Fleet of trucks');
        expect(image).toBeInTheDocument();
    });
});

describe('HowItWorks', () => {
    test('renders the section heading', () => {
        render(<HowItWorks/>);
        const heading = screen.getByRole('heading', {name: /how v\.a\.p\.o\.r works/i});
        expect(heading).toBeInTheDocument();
    });

    test('renders all three flow trip titles', () => {
        render(<HowItWorks/>);
        expect(screen.getByText('Live Data Stream')).toBeInTheDocument();
        expect(screen.getByText('Cloud Processing')).toBeInTheDocument();
        expect(screen.getByText('Dashboard Insights')).toBeInTheDocument();
    });

    test('renders one fewer connecting arrow than there are steps', () => {
        render(<HowItWorks/>);
        const{container} = render(<HowItWorks/>);
        const arrows = container.querySelectorAll('svg.lucide-arrow-right');
        expect(arrows.length).toBe(2);
    });
});

describe('CommandCenter', () => {
    test('renders the section heading', () => {
        render(<CommandCenter/>);
        const heading = screen.getByRole('heading', {name: /your command center/i});
        expect(heading).toBeInTheDocument();
    });

    test('renders the dashboard screenshot', () => {
        render(<CommandCenter/>);
        const image = screen.getByAltText('V.A.P.O.R Fleet Dashboard');
        expect(image).toBeInTheDocument();
    });
});

describe('Sections (default export)', () => {
    test('render all three subsections together', () => {
        render(<Sections/>);
        expect(screen.getByRole('heading', {name: /what you get, every day/i})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: /how v\.a\.p\.o\.r works/i})).toBeInTheDocument();
        expect(screen.getByRole('heading', {name: /your command center/i})).toBeInTheDocument();
    });
}); 



