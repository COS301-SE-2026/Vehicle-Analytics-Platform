import { render, screen, act } from "@testing-library/react";
import Landing from "@/pages/landing/Landing";

// Update the Navbar mock to include the form inputs so document.querySelector can find them
jest.mock('@/pages/landing/Navbar', () => () => (
    <div data-testid="navbar-mock">
        <form data-testid="login-form">
            <input type="email" name="email" data-testid="email-input" />
            <input type="password" name="password" data-testid="password-input" />
            <button type="submit" data-testid="submit-button">Submit</button>
        </form>
    </div>
));
jest.mock('@/pages/landing/Hero', () => () => <div data-testid="hero-mock">Hero</div>);
jest.mock('@/pages/landing/Sections', () => () => <div data-testid="sections-mock">Sections</div>);
jest.mock('@/pages/landing/Footer', () => () => <div data-testid="footer-mock">Footer</div>);

describe('LandingPage', () => {
    const originalLocation = window.location;

    beforeAll(() => {
        // Enable fake timers to test the 500ms setTimeout instantly
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        // Mock window.location to allow changing the search query per test
        delete window.location;
        window.location = { ...originalLocation, search: '' };
    });

    afterEach(() => {
        // Clean up
        window.location = originalLocation;
        jest.clearAllMocks();
    });

    test('renders Navbar, Hero, Sections, and Footer in correct order', () => {
        render(<Landing />);
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

    test('autofills credentials and submits form when URL parameters are present', () => {
        // 1. Set the mocked URL parameters
        window.location.search = '?email=kmj-viewer%40kmj.com&password=Capstone%4026&autosubmit=true';

        // 2. Render the component
        render(<Landing />);

        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');
        const submitButton = screen.getByTestId('submit-button');

        // 3. Verify inputs were populated with decoded URL values
        expect(emailInput.value).toBe('kmj-viewer@kmj.com');
        expect(passwordInput.value).toBe('Capstone@26');

        // 4. Spy on the submit button click
        const clickSpy = jest.spyOn(submitButton, 'click');

        // 5. Fast-forward time to bypass the 500ms setTimeout
        act(() => {
            jest.advanceTimersByTime(500);
        });

        // 6. Verify the auto-submit occurred
        expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    test('does not auto-submit if autosubmit flag is missing or false', () => {
        window.location.search = '?email=test%40test.com&password=pass';
        
        render(<Landing />);
        
        const submitButton = screen.getByTestId('submit-button');
        const clickSpy = jest.spyOn(submitButton, 'click');

        act(() => {
            jest.advanceTimersByTime(500);
        });

        // Verify it filled the inputs but did not trigger the submission
        expect(screen.getByTestId('email-input').value).toBe('test@test.com');
        expect(clickSpy).not.toHaveBeenCalled();
    });
});
