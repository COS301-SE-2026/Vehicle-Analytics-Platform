import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "@/pages/landing/Hero";


beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
});

const renderHero = () => render(
    <MemoryRouter>
        <Hero />
    </MemoryRouter>
);

describe('Hero', () => {
    test('renders the main hero title', () => {
        renderHero();
        const hero = screen.getByRole('heading', { level: 1 });
        expect(hero).toBeInTheDocument();
        expect(hero).toHaveTextContent(/vehicle analytics, processing/i);
        expect(hero).toHaveTextContent(/operations in real-time/i);
    });

    test('renders the supporting headline revealed on scroll', () => {
        renderHero();
        const subheading = screen.getByRole('heading', { level: 2 });
        expect(subheading).toHaveTextContent(/every vehicle is/i);
    });

    test('renders the hero image', () => {
        renderHero();
        const image = screen.getByAltText(/fleet of trucks and vans/i);
        expect(image).toBeInTheDocument();
    });

    test('renders the call-to-action button linking to /signup', () => {
        renderHero();
        const cta = screen.getByRole('link', { name: /view live demo fleet/i });
        expect(cta).toBeInTheDocument();
        expect(cta).toHaveAttribute('href', '/signup');
    });

    test('renders all three trust bar items', () => {
        renderHero();
        expect(screen.getByText(/built on aws/i)).toBeInTheDocument();
        expect(screen.getByText(/updates every 5-10 seconds/i)).toBeInTheDocument();
        expect(screen.getByText(/100\+ vehicles supported/i)).toBeInTheDocument();
    });

    test('renders all pain point cards with title and description', () => {
        const expectedPainPoints = [
            {
                title: 'Delayed Reports',
                description: /by the time your data arrives/i,
            },
            {
                title: 'Blind Spots on Risky Driving',
                description: /without continuous scoring/i,
            },
            {
                title: 'Disconnected Tools',
                description: /fragmentation kills efficiency/i,
            },
        ];
        renderHero();

        expectedPainPoints.forEach(({ title, description }) => {
            expect(screen.getByText(title)).toBeInTheDocument();
            expect(screen.getByText(description)).toBeInTheDocument();
        });
    });

    test('renders exactly three pain point cards', () => {
        renderHero();
        const painPointHeadings = screen.getAllByRole('heading', { level: 3 });
        expect(painPointHeadings).toHaveLength(3);
    });
});