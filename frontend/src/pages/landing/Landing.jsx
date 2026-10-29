import { useEffect } from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import Sections from './Sections';
import Footer from './Footer';

export default function LandingPage() {

    useEffect(() => {
        // This runs once when the LandingPage component mounts
        const urlParams = new URLSearchParams(window.location.search);
        
        const email = urlParams.get('email');
        const password = urlParams.get('password');
        const autoSubmit = urlParams.get('autosubmit');

        // Grab form inputs (assuming the form is rendered inside Navbar or Hero)
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
        const loginForm = document.querySelector('form');

        if (email && emailInput) {
            emailInput.value = decodeURIComponent(email);
        }
        
        if (password && passwordInput) {
            passwordInput.value = decodeURIComponent(password);
        }

        if (autoSubmit === 'true' && loginForm) {
            setTimeout(() => {
                loginForm.submit();
            }, 500);
        }
    }, []); // <-- The empty dependency array is crucial. It stops this from running on every re-render.

    return (
        <>
            <Navbar />
            <Hero />
            <Sections />
            <Footer />
        </>
    );
}
