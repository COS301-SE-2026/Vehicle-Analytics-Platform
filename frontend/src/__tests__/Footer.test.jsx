import {render,screen} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/pages/landing/Footer";

const renderFooter = () => render(
    <MemoryRouter>
        <Footer/>
    </MemoryRouter>
);

describe('Footer', () => {
    test('renders the heading', () => {
        renderFooter();
        const heading = screen.getByRole("heading", {
            name: /ready to see your fleet in real time\?/i,});
            expect(heading).toBeInTheDocument();
       });

        test('renders the supporting paragraph', () => {
            renderFooter();
            const paragraph = screen.getByText(
                /get instant access to live tracking, safety scoring, and fleet insights/i
            );
            expect(paragraph).toBeInTheDocument();
        });

        test('renders the call-to-action button linking to /signup', () => {
            renderFooter();
            const cta = screen.getByRole('link', {name: /view live demo fleet/i});
            expect(cta).toBeInTheDocument();
            expect(cta).toHaveAttribute('href', '/signup');
        });

        test('renders the copyright notice with the current year', () => {
            const currentYear = new Date().getFullYear();
            renderFooter();
            const copyright = screen.getByText((text) => text.includes(`${currentYear}`));
            expect(copyright).toBeInTheDocument();
            expect(copyright.textContent).toContain("V.A.P.O.R");
        });

        test('renders exactly one footer landmark', () => {
            renderFooter();
            const footer = screen.getByRole('contentinfo');
            expect(footer).toBeInTheDocument();
        })
    })