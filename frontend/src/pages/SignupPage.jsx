import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

//import { signUp } from 'aws-amplify/auth';

function getStrength(password) {
  return [
    password.length >= 8,
    /[a-zA-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = getStrength(form.password);
  const strength = checks.filter(Boolean).length;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) return setError('Please agree to the Terms and Privacy Policy.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (strength < 4) return setError('Please choose a stronger password.');

    setLoading(true);
    try {
      // await signUp({
      //   username: form.email,
      //   password: form.password,
      //   options: { userAttributes: { name: form.name, email: form.email } },
      // });
      navigate('/verify', { state: { email: form.email } });
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>Create Your Account</h2>
        <p className="auth-subtitle">Join the next generation of logistics management.</p>

        <button className="btn-google" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>OR</span></div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name" name="name" type="text"
              placeholder="John Doe"
              value={form.name} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              placeholder="john@company.com"
              value={form.email} onChange={handleChange} required
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password} onChange={handleChange} required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPass
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>

            {form.password && (
              <>
                <div className="strength-bar">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={`strength-seg${i < strength ? ' active' : ''}`} />
                  ))}
                </div>
                <div className="strength-hints">
                  {[
                    ['At least 8 characters', checks[0]],
                    ['Contains a letter', checks[1]],
                    ['Contains a number', checks[2]],
                    ['Contains a special character', checks[3]],
                  ].map(([label, met]) => (
                    <span key={label} className={`strength-hint${met ? ' met' : ''}`}>{label}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm" name="confirm"
              type="password"
              placeholder="Re-enter password"
              value={form.confirm} onChange={handleChange} required
            />
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            By creating an account you agree to our{' '}
            <a href="/terms">Terms</a>&nbsp;and&nbsp;<a href="/privacy">Privacy Policy</a>
          </label>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="auth-footer-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </AuthLayout>
  );
}