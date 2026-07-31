import { render, screen } from "@testing-library/react";
import Landing from "@/pages/landing/Landing";

jest.mock('@/pages/landing/Navbar', () => () => <div data-testid="navbar-mock">Navbar</div>);
jest.mock('@/pages/landing/Hero', () => () => <div data-testid="hero-mock">Hero</div>);
jest.mock('@/pages/landing/Sections', () => () => <div data-testid="sections-mock">Sections</div>);
jest.mock('@/pages/landing/Footer', () => () => <div data-testid="footer-mock">Footer</div>);

describe('LandingPage', () => {
    test('renders Navbar, Hero, Sections, and Footer', () => {
        render(<Landing/>);
        expect(screen.getByTestId("navbar-mock")).toBeInTheDocument();
        expect(screen.getByTestId("hero-mock")).toBeInTheDocument();
        expect(screen.getByTestId("sections-mock")).toBeInTheDocument();
        expect(screen.getByTestId("footer-mock")).toBeInTheDocument();

        const order = screen.getAllByTestId(/-mock$/).map((el) => el.getAttribute("data-testid"));
        expect(order).toEqual([
            "navbar-mock",
            "hero-mock",
            "sections-mock",
            "footer-mock",
        ]);
    });
});