import { useEffect } from 'react';

export default function LoginPage() {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        
        const email = urlParams.get('email');
        const password = urlParams.get('password');
        const autoSubmit = urlParams.get('autosubmit');

        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
        const loginForm = document.querySelector('form');

        // Helper to force React state to recognize the native DOM change
        const setReactInputValue = (inputElement, value) => {
            if (!inputElement) return;
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(inputElement, value);
            inputElement.dispatchEvent(new Event("input", { bubbles: true }));
        };

        if (email && emailInput) {
            setReactInputValue(emailInput, decodeURIComponent(email));
        }
        
        if (password && passwordInput) {
            setReactInputValue(passwordInput, decodeURIComponent(password));
        }

        if (autoSubmit === 'true' && loginForm) {
            setTimeout(() => {
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                } else {
                    // Fallback if no submit button exists
                    loginForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
            }, 500);
        }
    }, []); 

    return (
        <main>
            {/* Your login form JSX */}
        </main>
    );
}
