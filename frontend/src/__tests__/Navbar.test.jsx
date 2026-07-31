import {render,screen} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "@/pages/landing/Navbar";

const renderNavbar = () => render(
    <MemoryRouter>
        <Navbar/>
    </MemoryRouter>
);

describe("Navbar", () => {
    test('renders the V.A.P.O.R logo with correct alt text', () => {
        renderNavbar();
        const logo = screen.getByAltText("V.A.P.O.R");
        expect(logo).toBeInTheDocument();
        expect(logo.tagName).toBe("IMG");
    });

    test('renders the call-to-action button with correct text', () => {
        renderNavbar();
        const cta = screen.getByRole('link', {name: /view live demo fleet/i});
        expect(cta).toBeInTheDocument();
    });

    test('call-to-action links to /signup', () => {
        renderNavbar();
        const cta = screen.getByRole('link', {name: /view live demo fleet/i});
        expect(cta).toHaveAttribute('href', '/signup', () => {
            renderNavbar();
            const cta = screen.getByRole('link', {name: /view live demo fleet/i});
            expect(cta).toHaveAttribute('href', '/signup');
        });
    });

    test('renders a single header landmark', () => {
            renderNavbar();
            const header = screen.getByRole('banner');
            expect(header).toBeInTheDocument();
    });
})
