import{ render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "@/pages/landing/Hero";

const renderHero = () => render(
    <MemoryRouter>
        <Hero/>
    </MemoryRouter>
);

describe('Hero', () => {
    test('renders the hero', () => {
        renderHero();
        const hero= screen.getByRole('heading', {level: 1});
        expect(hero).toBeInTheDocument();
        expect(hero).toHaveTextContent(/every vehicle is/i);
    });

    test('renders the dashboard/live map image', () => {
        renderHero();
        const image = screen.getByAltText('Dashboard');
        expect(image).toBeInTheDocument();
    });

    test('renders the call-to-action button linking to /signup', () => {
        renderHero();
        const cta = screen.getByRole('link', {name: /view live demo fleet/i});
        expect(cta).toBeInTheDocument();
        expect(cta).toHaveAttribute('href', '/signup');
    });

    test('renders all three thrust bar items', () => {
        renderHero();
        expect(screen.getByText(/built on aws/i)).toBeInTheDocument();
        expect(screen.getByText(/updates every 5-10 seconds/i)).toBeInTheDocument();
        expect(screen.getByText(/15\+ vehicles supported/i)).toBeInTheDocument();
    });

    test('renders all pain point cards with title and description', () => {
        const expectedPainPoints = [
            {
                title:'Delayed Reports',
                description:/by the time your data arrives/i,
            },
            {
                title:'Blind Spots on Risky Driving',
                description:/without continous scoring/i,
            },
            {
                title:'Disconnected Tools',
                description:/fragmentation kills efficiency/i,
            },
        ];
        renderHero();

        expectedPainPoints.forEach(({title, description}) => {
            expect(screen.getByText(title)).toBeInTheDocument();
            expect(screen.getByText(description)).toBeInTheDocument();
        });
    });

    test('renders exactly three pain point cards', () => {
        renderHero();
        const painPointHeadings = screen.getAllByRole('heading', {level: 3});
        expect(painPointHeadings).toHaveLength(3);
    });
});
